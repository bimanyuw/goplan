import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { POLICY_VERSION } from '../../src/lib/account';
export async function testDatabase() {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb not null default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `);
  await db.exec(await readFile(new URL('../../supabase/migrations/202609070001_goplan.sql', import.meta.url), 'utf8'));
  return db;
}
export async function addUser(db: PGlite, id: string, metadata: object = { policy_version: POLICY_VERSION, privacy_consent: true, adult_confirmed: true }) {
  await db.exec('reset role');
  await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)', [id, id + '@example.test', JSON.stringify(metadata)]);
}
export async function asUser(db: PGlite, id: string) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec('set role authenticated');
}
export async function mutate(db: PGlite, action: string, payload: object, requestId = crypto.randomUUID()) {
  return db.query('select public.mutate_account($1,$2::jsonb,$3::uuid)', [action, JSON.stringify(payload), requestId]);
}
