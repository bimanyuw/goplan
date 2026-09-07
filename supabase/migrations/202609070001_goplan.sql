-- One account lock serializes financial writes, including writes from different devices.
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  policy_version text not null,
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 60),
  kind text not null check (kind in ('cash','bank','ewallet')),
  opening_balance bigint not null check (opening_balance between 0 and 100000000),
  unique(user_id, id)
);
create unique index wallet_unique_name on public.wallets(user_id, lower(btrim(name)));
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  kind text not null check (kind in ('expense','income','transfer')),
  wallet_id uuid not null,
  to_wallet_id uuid,
  name text not null check (length(btrim(name)) between 1 and 100),
  amount bigint not null check (amount between 1 and 100000000),
  category text check (category in ('food','transport','entertainment','academic','personal','other')),
  date date not null check (date >= '2000-01-01'),
  created_at timestamptz not null default now(),
  foreign key(user_id, wallet_id) references public.wallets(user_id, id),
  foreign key(user_id, to_wallet_id) references public.wallets(user_id, id),
  check ((kind = 'transfer' and to_wallet_id is not null and to_wallet_id <> wallet_id and category is null)
    or (kind = 'expense' and to_wallet_id is null and category is not null)
    or (kind = 'income' and to_wallet_id is null and category is null))
);
create index entries_owner_date on public.entries(user_id, date desc);
create table public.plans (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  month date not null check (extract(day from month) = 1 and month >= '2000-01-01'),
  allowance bigint not null check (allowance between 0 and 100000000),
  savings_target bigint not null check (savings_target between 0 and allowance),
  goal_name text not null default '' check (length(goal_name) <= 80),
  goal_saved bigint not null default 0 check (goal_saved between 0 and savings_target),
  category_limits jsonb not null,
  primary key(user_id, month)
);
-- Idempotency records contain request hashes only, not duplicate financial payloads.
create table public.mutation_receipts (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  request_id uuid not null,
  fingerprint text not null,
  created_at timestamptz not null default now(),
  primary key(user_id, request_id)
);
alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.entries enable row level security;
alter table public.plans enable row level security;
alter table public.mutation_receipts enable row level security;
create policy own_profile on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy own_wallets on public.wallets for select to authenticated using ((select auth.uid()) = user_id);
create policy own_entries on public.entries for select to authenticated using ((select auth.uid()) = user_id);
create policy own_plans on public.plans for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.profiles, public.wallets, public.entries, public.plans, public.mutation_receipts from anon, authenticated;
grant select on public.profiles, public.wallets, public.entries, public.plans to authenticated;

create function public.create_goplan_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.raw_user_meta_data->>'policy_version' is distinct from '2026-09-07'
    or new.raw_user_meta_data->>'privacy_consent' is distinct from 'true'
    or new.raw_user_meta_data->>'adult_confirmed' is distinct from 'true' then
    raise exception 'Persetujuan privasi, syarat penggunaan, dan usia 18 tahun diperlukan.';
  end if;
  insert into public.profiles(user_id, policy_version) values (new.id, '2026-09-07');
  return new;
end;
$$;
create trigger on_goplan_signup after insert on auth.users for each row execute function public.create_goplan_profile();
revoke all on function public.create_goplan_profile() from public, anon, authenticated;

create function public.get_account() returns jsonb
language sql stable security invoker set search_path = '' as $$
select jsonb_build_object(
  'profile', (select to_jsonb(p) from public.profiles p where p.user_id = auth.uid()),
  'wallets', coalesce((select jsonb_agg(to_jsonb(w) - 'user_id' order by w.name) from public.wallets w where w.user_id = auth.uid()), '[]'::jsonb),
  'entries', coalesce((select jsonb_agg(to_jsonb(e) - 'user_id' order by e.date desc, e.created_at desc, e.id) from public.entries e where e.user_id = auth.uid()), '[]'::jsonb),
  'plans', coalesce((select jsonb_agg(to_jsonb(p) - 'user_id' order by p.month desc) from public.plans p where p.user_id = auth.uid()), '[]'::jsonb)
);
$$;
revoke all on function public.get_account() from public, anon;
grant execute on function public.get_account() to authenticated;

create function public.mutate_account(p_action text, p_payload jsonb, p_request_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  fingerprint text := md5(p_action || p_payload::text);
  prior text;
  entity_id uuid;
  entry_date date;
  budget_month date;
  total_limits bigint := 0;
  category_name text;
  category_value numeric;
  money_key text;
begin
  if owner_id is null then raise exception 'Silakan masuk kembali.'; end if;
  perform 1 from public.profiles where user_id = owner_id for update;
  if not found then raise exception 'Profil akun tidak ditemukan.'; end if;
  if p_request_id is null or p_payload is null or jsonb_typeof(p_payload) <> 'object' then raise exception 'Permintaan tidak valid.'; end if;
  select r.fingerprint into prior from public.mutation_receipts r where r.user_id = owner_id and r.request_id = p_request_id;
  if found then
    if prior is distinct from fingerprint then raise exception 'ID permintaan sudah digunakan.'; end if;
    return;
  end if;
  entity_id := (p_payload->>'id')::uuid;
  foreach money_key in array case p_action when 'save_wallet' then array['opening_balance'] when 'save_entry' then array['amount'] when 'save_plan' then array['allowance','savings_target','goal_saved'] else array[]::text[] end loop
    if jsonb_typeof(p_payload->money_key) is distinct from 'number' or (p_payload->>money_key) !~ '^[0-9]+$' then raise exception 'Nominal harus Rupiah bulat dan tidak negatif.'; end if;
  end loop;
  if p_action = 'save_wallet' then
    if entity_id is null then raise exception 'ID dompet diperlukan.'; end if;
    if exists(select 1 from public.wallets where id = entity_id and user_id <> owner_id) then raise exception 'Dompet tidak tersedia.'; end if;
    insert into public.wallets(id,user_id,name,kind,opening_balance)
      values(entity_id,owner_id,btrim(p_payload->>'name'),p_payload->>'kind',(p_payload->>'opening_balance')::bigint)
      on conflict(id) do update set name=excluded.name, kind=excluded.kind, opening_balance=excluded.opening_balance where wallets.user_id=owner_id;
  elsif p_action = 'delete_wallet' then
    if exists(select 1 from public.entries where user_id=owner_id and (wallet_id=entity_id or to_wallet_id=entity_id)) then raise exception 'Hapus atau pindahkan catatan dompet ini terlebih dahulu.'; end if;
    delete from public.wallets where id=entity_id and user_id=owner_id;
    if not found then raise exception 'Dompet tidak ditemukan.'; end if;
  elsif p_action = 'save_entry' then
    if entity_id is null then raise exception 'ID catatan diperlukan.'; end if;
    entry_date := (p_payload->>'date')::date;
    if entry_date > (now() at time zone 'Asia/Jakarta')::date then raise exception 'Tanggal tidak boleh di masa depan.'; end if;
    if exists(select 1 from public.entries where id=entity_id and user_id<>owner_id) then raise exception 'Catatan tidak tersedia.'; end if;
    insert into public.entries(id,user_id,kind,wallet_id,to_wallet_id,name,amount,category,date)
      values(entity_id,owner_id,p_payload->>'kind',(p_payload->>'wallet_id')::uuid,
        (p_payload->>'to_wallet_id')::uuid,btrim(p_payload->>'name'),(p_payload->>'amount')::bigint,p_payload->>'category',entry_date)
      on conflict(id) do update set kind=excluded.kind,wallet_id=excluded.wallet_id,to_wallet_id=excluded.to_wallet_id,
        name=excluded.name,amount=excluded.amount,category=excluded.category,date=excluded.date where entries.user_id=owner_id;
  elsif p_action = 'delete_entry' then
    delete from public.entries where id=entity_id and user_id=owner_id;
    if not found then raise exception 'Catatan tidak ditemukan.'; end if;
  elsif p_action = 'save_plan' then
    budget_month := (p_payload->>'month')::date;
    if budget_month > date_trunc('month',now() at time zone 'Asia/Jakarta')::date then raise exception 'Pilih bulan berjalan atau sebelumnya.'; end if;
    if jsonb_typeof(p_payload->'category_limits') is distinct from 'object' then raise exception 'Alokasi kategori diperlukan.'; end if;
    if (select count(*) from jsonb_object_keys(p_payload->'category_limits')) <> 6 then raise exception 'Enam kategori diperlukan.'; end if;
    foreach category_name in array array['food','transport','entertainment','academic','personal','other'] loop
      if jsonb_typeof(p_payload->'category_limits'->category_name) is distinct from 'number' then raise exception 'Alokasi kategori tidak valid.'; end if;
      category_value := (p_payload->'category_limits'->>category_name)::numeric;
      if category_value < 0 or category_value > 100000000 or category_value <> trunc(category_value) then raise exception 'Alokasi harus Rupiah bulat dan tidak negatif.'; end if;
      total_limits := total_limits + category_value::bigint;
    end loop;
    if total_limits + (p_payload->>'savings_target')::bigint > (p_payload->>'allowance')::bigint then raise exception 'Alokasi kategori dan target tabungan melebihi anggaran.'; end if;
    insert into public.plans(user_id,month,allowance,savings_target,goal_name,goal_saved,category_limits)
      values(owner_id,budget_month,(p_payload->>'allowance')::bigint,(p_payload->>'savings_target')::bigint,
        btrim(p_payload->>'goal_name'),(p_payload->>'goal_saved')::bigint,p_payload->'category_limits')
      on conflict(user_id,month) do update set allowance=excluded.allowance,savings_target=excluded.savings_target,
        goal_name=excluded.goal_name,goal_saved=excluded.goal_saved,category_limits=excluded.category_limits;
  else raise exception 'Aksi tidak dikenal.';
  end if;
  if exists (
    select 1 from public.wallets w where w.user_id=owner_id and
      w.opening_balance + coalesce((select sum(case when e.wallet_id=w.id then case when e.kind='income' then e.amount else -e.amount end else e.amount end)
        from public.entries e where e.user_id=owner_id and (e.wallet_id=w.id or e.to_wallet_id=w.id)),0) < 0
  ) then raise exception 'Saldo dompet tidak cukup. Perubahan dibatalkan.'; end if;
  insert into public.mutation_receipts(user_id,request_id,fingerprint) values(owner_id,p_request_id,fingerprint);
end;
$$;
revoke all on function public.mutate_account(text,jsonb,uuid) from public, anon;
grant execute on function public.mutate_account(text,jsonb,uuid) to authenticated;

create function public.delete_my_account(p_confirmation text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or p_confirmation is distinct from 'HAPUS' then raise exception 'Konfirmasi penghapusan diperlukan.'; end if;
  perform 1 from public.profiles where user_id=auth.uid() for update;
  -- Entries reference wallets, so remove them first. The remaining personal rows cascade.
  delete from public.entries where user_id=auth.uid();
  delete from auth.users where id=auth.uid();
end;
$$;
revoke all on function public.delete_my_account(text) from public, anon;
grant execute on function public.delete_my_account(text) to authenticated;
