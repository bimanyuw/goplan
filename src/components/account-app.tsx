'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, BookOpen, Leaf, LayoutDashboard, Wallet, ReceiptText, Settings, Plus, LogOut } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { CATEGORY_NAMES, POLICY_VERSION, MAX_MONEY, balance, monthlySummary, money, todayJakarta, type AccountData, type AccountWallet, type Entry, type Plan, type Category } from '@/lib/account';
import { formatRupiah } from '@/lib/finance';
import SiteFooter from './site-footer';

const navigation = [
  { id: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
  { id: 'wallets', label: 'Dompet', icon: Wallet },
  { id: 'entries', label: 'Transaksi', icon: ReceiptText },
  { id: 'plan', label: 'Anggaran & target', icon: BookOpen },
  { id: 'settings', label: 'Akun & data', icon: Settings },
] as const;
type View = typeof navigation[number]['id'];
type Editor = { kind: 'wallet'; wallet?: AccountWallet } | { kind: 'entry'; entry?: Entry; entryKind: Entry['kind'] } | { kind: 'delete'; entity: 'entry' | 'wallet'; id: string; name: string } | { kind: 'account' };
const kinds = { expense: 'Pengeluaran', income: 'Pemasukan', transfer: 'Transfer' };
const walletKinds = { cash: 'Tunai', bank: 'Bank', ewallet: 'E-wallet' };

export default function AccountApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false);
  const [authError, setAuthError] = useState('');
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) { setLoading(false); return; }
    let active = true;
    const { data: subscription } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      setLoading(false);
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setAuthError('Sesi tidak dapat dibuka. Coba masuk kembali atau minta tautan email baru.');
      setSession(data.session);
      setRecovery(window.location.pathname === '/auth/reset' && !!data.session);
      if (new URLSearchParams(window.location.search).has('error')) setAuthError('Tautan sudah tidak berlaku. Minta tautan email baru.');
      setLoading(false);
    }).catch(() => { if (active) { setAuthError('Tidak dapat terhubung. Periksa koneksi lalu muat ulang.'); setLoading(false); } });
    return () => { active = false; subscription.subscription.unsubscribe(); };
  }, []);
  if (loading) return <main id="main-content" className="public-main" tabIndex={-1}><p role="status">Membuka akun…</p></main>;
  if (session && !recovery) return <Workspace key={session.user.id} session={session} />;
  return <><main id="main-content" className="auth-layout" tabIndex={-1}>
    <section className="welcome"><Link className="brand" href="/"><Leaf aria-hidden="true" />GoPlan</Link><span className="eyebrow">UNTUK KESEHARIAN MAHASISWA</span><h1>Uang kuliah.<br />Uang makan.<br /><span>Semua terencana.</span></h1><p>Catat pemasukan, kenali pengeluaran, dan atur target tabungan dalam satu tempat.</p><ul className="benefits"><li><Wallet aria-hidden="true" />Catatan dompet dan transaksi milikmu</li><li><BookOpen aria-hidden="true" />Anggaran yang kamu tentukan sendiri</li><li><Leaf aria-hidden="true" />Gratis, tanpa iklan dan pelacak pemasaran</li></ul><p className="small-text">Pencatatan manual. GoPlan tidak terhubung ke rekening bank dan tidak memindahkan uang.</p></section>
    <section className="card auth-card" aria-labelledby="auth-heading"><AuthForm recovery={recovery} onRecovered={() => { setRecovery(false); window.history.replaceState(null, '', '/'); }} />{authError && <p role="alert" className="notice error">{authError}</p>}</section>
  </main><SiteFooter /></>;
}

function AuthForm({ recovery, onRecovered }: { recovery: boolean; onRecovered: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset' | 'resend'>('login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const configured = !!getSupabase();
  const errorRef = useRef<HTMLParagraphElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  function changeMode(next: typeof mode) { setMode(next); setError(''); setNotice(''); requestAnimationFrame(() => headingRef.current?.focus()); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const supabase = getSupabase();
    if (!supabase) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setError(''); setNotice('');
    try {
      const email = String(form.get('email') ?? '').trim();
      const password = String(form.get('password') ?? '');
      if (recovery) {
        if (password.length < 12) throw new Error('Gunakan minimal 12 karakter.');
        const result = await supabase.auth.updateUser({ password });
        if (result.error) throw result.error;
        onRecovered();
      } else if (mode === 'signup') {
        if (!form.get('terms') || !form.get('privacy') || !form.get('adult')) throw new Error('Lengkapi persetujuan sebelum membuat akun.');
        const result = await supabase.auth.signUp({ email, password, options: {
          emailRedirectTo: window.location.origin + '/auth/callback',
          data: { policy_version: POLICY_VERSION, privacy_consent: true, adult_confirmed: true },
        } });
        if (result.error) throw result.error;
        setNotice('Jika alamat ini dapat didaftarkan, email konfirmasi akan dikirim. Buka tautannya di browser ini. Jika sudah memiliki akun, silakan masuk.');
      } else if (mode === 'reset') {
        const result = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/auth/reset' });
        if (result.error) throw result.error;
        setNotice('Jika akun tersedia, tautan pengaturan ulang akan dikirim ke emailmu. Buka di browser ini.');
      } else if (mode === 'resend') {
        const result = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: window.location.origin + '/auth/callback' } });
        if (result.error) throw result.error;
        setNotice('Jika akun menunggu konfirmasi, email baru akan dikirim. Buka di browser ini.');
      } else {
        const result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw new Error('Tidak dapat masuk. Periksa email, kata sandi, dan konfirmasi emailmu.');
      }
    } catch (e) {
      const code = e && typeof e === 'object' && 'code' in e ? String(e.code) : '';
      setError(code ? (code.includes('rate') ? 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.' : 'Permintaan tidak berhasil. Periksa isian dan koneksi, lalu coba lagi.') : e instanceof Error ? e.message : 'Permintaan tidak berhasil. Coba lagi.');
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally { setBusy(false); }
  }
  return <><h2 id="auth-heading" ref={headingRef} tabIndex={-1}>{recovery ? 'Buat kata sandi baru' : mode === 'signup' ? 'Buat akun GoPlan' : mode === 'reset' ? 'Lupa kata sandi?' : mode === 'resend' ? 'Kirim ulang konfirmasi' : 'Masuk ke GoPlan'}</h2><p className="muted">{mode === 'signup' ? 'Mulai dari catatan kosong. Hanya email dan kata sandi yang diperlukan.' : 'Ruang untuk merencanakan keuanganmu.'}</p>
    {!configured && <p className="notice" role="status">Pendaftaran belum dibuka. Koneksi penyimpanan akun sedang disiapkan. Kamu tetap dapat membaca informasi layanan dan kebijakan di bawah.</p>}
    <form onSubmit={submit} className="stack" aria-busy={busy}>
      {!recovery && <label>Email<input name="email" type="email" autoComplete="email" maxLength={254} required disabled={busy || !configured} /></label>}
      {(recovery || mode === 'signup' || mode === 'login') && <label>Kata sandi<input name="password" type="password" autoComplete={recovery || mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'login' && !recovery ? 1 : 12} maxLength={128} required disabled={busy || !configured} aria-describedby="password-help" /><span id="password-help" className="small-text">{mode === 'login' && !recovery ? 'Kamu boleh menempelkan kata sandi dari password manager.' : 'Minimal 12 karakter. Gunakan kata sandi yang berbeda dari akun lain.'}</span></label>}
      {mode === 'signup' && !recovery && <fieldset disabled={busy || !configured}><legend>Persetujuan pendaftaran</legend><label className="checkbox"><input type="checkbox" name="adult" required /><span>Saya berusia 18 tahun atau lebih.</span></label><label className="checkbox"><input type="checkbox" name="terms" required /><span>Saya menyetujui <Link href="/terms">syarat penggunaan</Link>.</span></label><label className="checkbox"><input type="checkbox" name="privacy" required /><span>Saya menyetujui penyimpanan dan pengolahan catatan keuangan untuk menyediakan layanan sesuai <Link href="/privacy">kebijakan privasi</Link>. Persetujuan dapat ditarik dengan menghapus akun.</span></label><p className="small-text">Tidak ada persetujuan pemasaran. Jangan masukkan nomor rekening, PIN, atau identitas resmi.</p></fieldset>}
      {error && <p className="notice error" role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}
      <button className="primary-button" disabled={busy || !configured}>{busy ? 'Memproses…' : recovery ? 'Simpan kata sandi baru' : mode === 'signup' ? 'Buat akun gratis' : mode === 'reset' ? 'Kirim tautan pemulihan' : mode === 'resend' ? 'Kirim email konfirmasi' : 'Masuk'}</button>
    </form>
    {!recovery && <nav className="auth-links" aria-label="Pilihan akun"><button className="text-button" disabled={busy} onClick={() => changeMode(mode === 'signup' ? 'login' : 'signup')}>{mode === 'signup' ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar'}</button>{mode !== 'login' && mode !== 'signup' && <button className="text-button" disabled={busy} onClick={() => changeMode('login')}>Kembali ke masuk</button>}{mode === 'login' && <><button className="text-button" disabled={busy} onClick={() => changeMode('reset')}>Lupa kata sandi</button><button className="text-button" disabled={busy} onClick={() => changeMode('resend')}>Kirim ulang email konfirmasi</button></>}</nav>}
    <p className="small-text">Sesi masuk disimpan di browser ini. Keluar setelah memakai perangkat bersama. <Link href="/cookies">Tentang penyimpanan sesi</Link>.</p>
  </>;
}

function Workspace({ session }: { session: Session }) {
  const [data, setData] = useState<AccountData | null>(null);
  const [view, setView] = useState<View>('overview');
  const [month, setMonth] = useState(() => todayJakarta().slice(0, 7));
  const [today, setToday] = useState(todayJakarta);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState('all');
  const [walletFilter, setWalletFilter] = useState('all');
  const heading = useRef<HTMLHeadingElement>(null);
  const mutationLock = useRef(false);
  const retry = useRef<{ fingerprint: string; id: string } | null>(null);
  const supabase = getSupabase()!;
  const refresh = useCallback(async () => {
    const { data: next, error: fetchError } = await supabase.rpc('get_account');
    if (fetchError || !next?.profile) throw new Error('Catatan belum dapat dimuat. Periksa koneksi atau hubungi pengelola jika masalah berlanjut.');
    setData(next as AccountData);
  }, [supabase]);
  useEffect(() => { void refresh().catch(e => setError(e.message)); }, [refresh]);
  useEffect(() => {
    const onFocus = () => { setToday(todayJakarta()); if (!mutationLock.current) void refresh().catch(() => setError('Sinkronisasi gagal. Data yang tampil mungkin belum terbaru. Tekan Muat ulang data.')); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);
  async function mutate(action: string, payload: object) {
    if (mutationLock.current) throw new Error('Tunggu penyimpanan sebelumnya selesai.');
    mutationLock.current = true; setBusy(true); setError(''); setStatus('');
    const fingerprint = JSON.stringify([action, payload]);
    if (retry.current?.fingerprint !== fingerprint) retry.current = { fingerprint, id: crypto.randomUUID() };
    try {
      const result = await supabase.rpc('mutate_account', { p_action: action, p_payload: payload, p_request_id: retry.current.id });
      if (result.error) {
        if (result.error.code === 'P0001') throw new Error(result.error.message);
        if (result.error.code === '23505') throw new Error('Nama atau catatan sudah digunakan. Pilih nama lain atau muat ulang data.');
        if (['23503', '23514', '23502', '22P02', '22003', '22007', '22008'].includes(result.error.code)) throw new Error('Data tidak valid atau dompet sudah berubah. Periksa isian lalu coba lagi.');
        throw new Error('Penyimpanan belum dapat dikonfirmasi. Periksa koneksi lalu coba simpan lagi; permintaan yang sama tidak akan digandakan.');
      }
      await refresh();
      retry.current = null;
      setStatus('Perubahan tersimpan di akunmu.');
    } finally { mutationLock.current = false; setBusy(false); }
  }
  function navigate(next: View) { setView(next); setStatus(''); requestAnimationFrame(() => heading.current?.focus()); }
  async function signOut() {
    setBusy(true); setError('');
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
    if (signOutError) setError('Belum dapat keluar. Periksa koneksi dan coba lagi.');
    setBusy(false);
  }
  async function deleteAccount(form: FormData) {
    if (String(form.get('confirmation')) !== 'HAPUS') throw new Error('Ketik HAPUS untuk mengonfirmasi.');
    const verified = await supabase.auth.signInWithPassword({ email: session.user.email!, password: String(form.get('password')) });
    if (verified.error) throw new Error('Kata sandi tidak sesuai. Akun belum dihapus.');
    const result = await supabase.rpc('delete_my_account', { p_confirmation: 'HAPUS' });
    if (result.error) throw new Error('Akun belum dapat dihapus. Periksa koneksi lalu coba lagi.');
    await supabase.auth.signOut({ scope: 'local' });
    window.location.assign('/');
  }
  async function exportData() {
    setError('');
    try {
      const result = await supabase.rpc('get_account');
      if (result.error || !result.data?.profile) throw new Error('Data belum dapat diekspor. Coba lagi setelah koneksi pulih.');
      const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), email: session.user.email, ...result.data }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'goplan-' + today + '.json'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus('Ekspor dimulai. Simpan file keuanganmu di tempat pribadi.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Ekspor gagal.'); }
  }
  const summary = data ? monthlySummary(data, month, today) : null;
  const monthName = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(month + '-01T12:00:00'));
  const entries = summary?.entries.filter(e => (kindFilter === 'all' || e.kind === kindFilter) && (walletFilter === 'all' || e.wallet_id === walletFilter || e.to_wallet_id === walletFilter) && `${e.name} ${e.category ? CATEGORY_NAMES[e.category] : ''}`.toLocaleLowerCase('id').includes(search.toLocaleLowerCase('id'))) ?? [];
  return <><div className="app-shell"><aside className="sidebar"><Link className="brand" href="/"><Leaf aria-hidden="true" />GoPlan</Link><p className="eyebrow">RUANG KEUANGANMU</p><nav aria-label="Navigasi utama">{navigation.map(n => <button key={n.id} aria-current={view === n.id ? 'page' : undefined} onClick={() => navigate(n.id)}><n.icon aria-hidden="true" size={20} />{n.label}</button>)}</nav><div className="sidebar-bottom"><p className="small-text">Masuk sebagai</p><p className="account-email">{session.user.email}</p><button className="secondary-button" onClick={signOut} disabled={busy}><LogOut size={18} aria-hidden="true" />Keluar dari akun</button></div></aside>
    <main id="main-content" className="workspace" tabIndex={-1}><header className="workspace-header"><span>Catatan pribadi · Rupiah</span><label>Bulan catatan<input type="month" aria-label="Bulan catatan" value={month} min="2000-01" max={today.slice(0, 7)} onChange={e => { const value = e.target.value; if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value) && value >= '2000-01' && value <= today.slice(0, 7)) setMonth(value); }} /></label></header>
    <div className="main-content"><div className="page-heading"><div><p className="eyebrow">SEDIKIT CATATAN, LEBIH BANYAK KEJELASAN</p><h1 ref={heading} tabIndex={-1}>{navigation.find(n => n.id === view)?.label}</h1><p className="muted">{monthName}. Mulai dari yang kamu punya, rencanakan yang kamu perlu.</p></div>{data && <button className="primary-button" disabled={busy} onClick={() => setEditor({ kind: 'entry', entryKind: 'expense' })}><Plus size={18} aria-hidden="true" />Catat pengeluaran</button>}</div>
      <div role="status" aria-live="polite">{status && <p className="notice">{status}</p>}</div>
      {error && <div role="alert" className="notice error"><p>{error}</p><button className="secondary-button" disabled={busy} onClick={() => { setError(''); void refresh().catch(e => setError(e.message)); }}>Muat ulang data</button></div>}
      {!data && !error && <p role="status">Memuat catatanmu…</p>}
      {data && summary && <>
        {view === 'overview' && <><div className="metrics"><Metric label="Sisa anggaran bulan ini" value={summary.plan.allowance > 0 ? formatRupiah(summary.remaining) : 'Belum diatur'} note={summary.remaining < 0 ? 'Pengeluaran melebihi anggaran.' : 'Anggaran dikurangi pengeluaran.'} highlight /><Metric label="Pengeluaran" value={formatRupiah(summary.spent)} note="Transfer antar-dompet tidak dihitung." /><Metric label="Batas harian rencana" value={summary.safeDaily === null ? 'Belum tersedia' : formatRupiah(summary.safeDaily)} note="Mempertimbangkan sisa anggaran, saldo tercatat, dan target tabungan." /><Metric label="Total saldo tercatat" value={formatRupiah(summary.cash)} note="Seluruh dompet dan tanggal. Cocokkan dengan saldo aktualmu." /></div>
          {(data.wallets.length === 0 || summary.plan.allowance === 0) && <section className="card onboarding"><h2>Mulai merencanakan bulanmu</h2><p>Akunmu dimulai tanpa transaksi contoh. Tambahkan dompet untuk mencatat uang yang kamu miliki, lalu tentukan anggaran bulanan.</p><div className="actions">{data.wallets.length === 0 && <button className="primary-button" onClick={() => setEditor({ kind: 'wallet' })}>Tambahkan dompet pertama</button>}<button className="secondary-button" onClick={() => navigate('plan')}>Atur anggaran bulan ini</button></div></section>}
          <div className="content-grid"><section className="card"><h2>Pengeluaran per kategori</h2><p className="muted">Jumlah aktual dan alokasi untuk {monthName}.</p><CategoryList entries={summary.entries} plan={summary.plan} /></section><section className="card insight-card"><span className="eyebrow">BERDASARKAN CATATANMU</span><h2>Ruang untuk bulan ini</h2>{summary.forecast === null ? <p>Atur anggaran dan catat pengeluaran untuk melihat perkiraan sisa anggaran akhir bulan.</p> : <><p>Perkiraan sisa anggaran akhir bulan</p><strong className="large-number">{formatRupiah(summary.forecast)}</strong><p>{summary.forecast < summary.plan.savings_target ? 'Perkiraan belum mencapai target tabungan. Tinjau pengeluaran pilihan tanpa mengorbankan kebutuhan utama.' : 'Perkiraan berada pada atau di atas target tabungan yang kamu tentukan.'}</p></>}<p className="small-text">Perkiraan memakai rata-rata pengeluaran harian bulan terpilih. Pencatatan yang belum lengkap dapat mengubah hasil. Ini perhitungan sederhana, bukan model AI atau jaminan hasil.</p><button className="secondary-button" onClick={() => navigate('plan')}>Tinjau anggaran & target</button></section></div>
          <section className="card"><div className="section-heading"><h2>Catatan terbaru</h2><button className="text-button" onClick={() => navigate('entries')}>Lihat semua transaksi</button></div><EntryList entries={summary.entries.slice(0, 5)} wallets={data.wallets} onEdit={e => setEditor({ kind: 'entry', entry: e, entryKind: e.kind })} onDelete={e => setEditor({ kind: 'delete', entity: 'entry', id: e.id, name: e.name })} /></section></>}
        {view === 'wallets' && <><div className="section-heading"><p className="muted">Saldo dari catatanmu di semua bulan. Gunakan nama seperti “Tunai” atau “Bank utama”, tanpa nomor rekening.</p><button className="primary-button" onClick={() => setEditor({ kind: 'wallet' })}>Tambah dompet</button></div><div className="actions"><button className="secondary-button" disabled={!data.wallets.length} onClick={() => setEditor({ kind: 'entry', entryKind: 'income' })}><ArrowDownLeft aria-hidden="true" size={18} />Catat pemasukan</button><button className="secondary-button" disabled={data.wallets.length < 2} onClick={() => setEditor({ kind: 'entry', entryKind: 'transfer' })}><ArrowLeftRight aria-hidden="true" size={18} />Catat transfer antar-dompet</button></div><div className="wallet-grid">{data.wallets.map(w => <article className="card wallet-card" key={w.id}><span className="eyebrow">{walletKinds[w.kind]}</span><h2>{w.name}</h2><strong className="large-number">{formatRupiah(balance(w, data.entries))}</strong><p className="small-text">Saldo awal {formatRupiah(w.opening_balance)}</p><div className="actions"><button className="secondary-button" onClick={() => setEditor({ kind: 'wallet', wallet: w })} aria-label={`Ubah dompet ${w.name}`}>Ubah dompet</button><button className="text-button danger-text" onClick={() => setEditor({ kind: 'delete', entity: 'wallet', id: w.id, name: w.name })} aria-label={`Hapus dompet ${w.name}`}>Hapus dompet</button></div></article>)}</div>{!data.wallets.length && <p className="empty-state">Belum ada dompet. Tambahkan dompet dan saldo awalmu.</p>}</>}
        {view === 'entries' && <section className="card"><div className="actions"><button className="secondary-button" onClick={() => setEditor({ kind: 'entry', entryKind: 'income' })}>Catat pemasukan</button><button className="secondary-button" disabled={data.wallets.length < 2} onClick={() => setEditor({ kind: 'entry', entryKind: 'transfer' })}>Catat transfer antar-dompet</button></div><div className="filter-grid"><label>Cari transaksi<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Nama atau kategori" /></label><label>Jenis transaksi<select value={kindFilter} onChange={e => setKindFilter(e.target.value)}><option value="all">Semua jenis</option>{Object.entries(kinds).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label>Filter dompet<select value={walletFilter} onChange={e => setWalletFilter(e.target.value)}><option value="all">Semua dompet</option>{data.wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label></div><p className="small-text" role="status">{entries.length} catatan ditemukan untuk {monthName}.</p><EntryList entries={entries} wallets={data.wallets} onEdit={e => setEditor({ kind: 'entry', entry: e, entryKind: e.kind })} onDelete={e => setEditor({ kind: 'delete', entity: 'entry', id: e.id, name: e.name })} /></section>}
        {view === 'plan' && <PlanForm key={month} plan={summary.plan} busy={busy} onSave={p => mutate('save_plan', p)} />}
        {view === 'settings' && <div className="content-grid"><section className="card stack"><h2>Akun & kendali datamu</h2><p>Email: <strong className="account-email">{session.user.email}</strong></p><p>Kebijakan disetujui pada {new Date(data.profile.consent_at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}, versi {data.profile.policy_version}.</p><p>Catatan keuangan tersimpan di akun Supabase dan dimuat saat kamu masuk. Ubah atau hapus catatan melalui halaman Transaksi dan Dompet.</p><button className="secondary-button" onClick={exportData} disabled={busy}>Unduh seluruh data saya (JSON)</button><Link href="/auth/reset">Ubah kata sandi</Link><Link href="/privacy">Baca hak privasi dan penyimpanan data</Link></section><section className="card stack"><h2>Hapus akun</h2><p>Menghapus akun menarik persetujuan penggunaan data dan menghapus catatan aktif, dompet, serta anggaran dari layanan. Salinan cadangan penyedia mengikuti retensinya. Unduh data sebelum melanjutkan.</p><button className="danger-button" onClick={() => setEditor({ kind: 'account' })}>Hapus akun dan seluruh data</button></section></div>}
      </>}
    </div><SiteFooter /></main></div>
    {editor && data && <EditorModal key={JSON.stringify(editor)} editor={editor} data={data} today={today} onClose={() => setEditor(null)} onSave={mutate} onDeleteAccount={deleteAccount} />}
  </>;
}

function Metric({ label, value, note, highlight = false }: { label: string; value: string; note: string; highlight?: boolean }) {
  return <section className={`card metric ${highlight ? 'highlight' : ''}`}><h2>{label}</h2><strong>{value}</strong><p>{note}</p></section>;
}
function CategoryList({ entries, plan }: { entries: Entry[]; plan: Plan }) {
  return <ul className="category-list">{Object.entries(CATEGORY_NAMES).map(([id, label]) => {
    const spent = entries.filter(e => e.kind === 'expense' && e.category === id).reduce((s, e) => s + e.amount, 0);
    const limit = plan.category_limits[id as Category];
    return <li key={id}><div><strong>{label}</strong><span>{formatRupiah(spent)} / {formatRupiah(limit)}</span></div><div className="progress-track" aria-hidden="true"><span style={{ width: `${limit > 0 ? Math.min(100, spent / limit * 100) : spent > 0 ? 100 : 0}%` }} /></div><p className={`small-text ${spent > limit ? 'danger-text' : ''}`}>{spent > limit ? `Melebihi alokasi ${formatRupiah(spent - limit)}` : limit ? `Sisa alokasi ${formatRupiah(limit - spent)}` : 'Alokasi belum diatur'}</p></li>;
  })}</ul>;
}
function EntryList({ entries, wallets, onEdit, onDelete }: { entries: Entry[]; wallets: AccountWallet[]; onEdit: (e: Entry) => void; onDelete: (e: Entry) => void }) {
  if (!entries.length) return <p className="empty-state">Belum ada transaksi yang cocok. Catat pemasukan atau pengeluaranmu, atau ubah filter.</p>;
  return <ul className="entry-list">{entries.map(e => <li key={e.id}><span className="entry-icon" aria-hidden="true">{e.kind === 'income' ? <ArrowDownLeft /> : e.kind === 'transfer' ? <ArrowLeftRight /> : <ArrowUpRight />}</span><div className="entry-detail"><strong>{e.name}</strong><p className="small-text">{kinds[e.kind]} · {wallets.find(w => w.id === e.wallet_id)?.name}{e.to_wallet_id && ` → ${wallets.find(w => w.id === e.to_wallet_id)?.name}`}{e.category && ` · ${CATEGORY_NAMES[e.category]}`}</p><time className="small-text" dateTime={e.date}>{new Date(e.date + 'T12:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</time></div><strong className="entry-amount">{e.kind === 'expense' ? '−' : e.kind === 'income' ? '+' : ''}{formatRupiah(e.amount)}</strong><div className="entry-actions"><button className="text-button" aria-label={`Ubah transaksi ${e.name}`} onClick={() => onEdit(e)}>Ubah</button><button className="text-button danger-text" aria-label={`Hapus transaksi ${e.name}`} onClick={() => onDelete(e)}>Hapus</button></div></li>)}</ul>;
}

function PlanForm({ plan, busy, onSave }: { plan: Plan; busy: boolean; onSave: (p: Plan) => Promise<void> }) {
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const errorRef = useRef<HTMLParagraphElement>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(''); setSaved('');
    try {
      const f = new FormData(e.currentTarget);
      const limits = Object.fromEntries(Object.keys(CATEGORY_NAMES).map(c => [c, money(f.get(c), true)])) as Plan['category_limits'];
      const allowance = money(f.get('allowance'), true), target = money(f.get('savings_target'), true), reserved = money(f.get('goal_saved'), true);
      if (Object.values(limits).reduce((s, v) => s + v, 0) + target > allowance) throw new Error('Total alokasi kategori dan target tabungan tidak boleh melebihi anggaran bulanan.');
      if (reserved > target) throw new Error('Tabungan yang dicatat tidak boleh melebihi target. Naikkan target jika diperlukan.');
      await onSave({ month: plan.month, allowance, savings_target: target, goal_saved: reserved, goal_name: String(f.get('goal_name')).trim(), category_limits: limits });
      setSaved('Anggaran dan target bulan ini tersimpan.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Anggaran belum tersimpan.'); requestAnimationFrame(() => errorRef.current?.focus()); }
  }
  return <form className="card stack" onSubmit={submit} aria-busy={busy}><h2>Rencanakan sesuai kebutuhanmu</h2><p className="muted">Anggaran adalah batas rencana, bukan saldo. Mencatat pemasukan tidak otomatis menaikkan anggaran. Semua nominal dalam Rupiah bulat.</p><fieldset disabled={busy}><legend>Anggaran bulanan</legend><MoneyField label="Total anggaran bulanan (Rp)" name="allowance" value={plan.allowance} zero /><div className="form-grid">{Object.entries(CATEGORY_NAMES).map(([id, label]) => <MoneyField key={id} label={`Alokasi ${label} (Rp)`} name={id} value={plan.category_limits[id as Category]} zero />)}</div></fieldset><fieldset disabled={busy}><legend>Target tabungan bulan ini</legend><label>Nama target (opsional)<input name="goal_name" maxLength={80} defaultValue={plan.goal_name} placeholder="Contoh: Dana buku semester depan" /></label><div className="form-grid"><MoneyField label="Target tabungan (Rp)" name="savings_target" value={plan.savings_target} zero /><MoneyField label="Sudah disisihkan (Rp)" name="goal_saved" value={plan.goal_saved} zero /></div><p className="small-text">“Sudah disisihkan” adalah catatanmu sendiri, bagian dari saldo dompet. GoPlan tidak mengunci atau memindahkan uang. Target tabungan digunakan untuk menghitung batas harian rencana.</p></fieldset>{error && <p role="alert" className="notice error" tabIndex={-1} ref={errorRef}>{error}</p>}{saved && <p role="status" className="notice">{saved}</p>}<button className="primary-button" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan anggaran & target'}</button></form>;
}
function MoneyField({ label, name, value, zero = false }: { label: string; name: string; value?: number; zero?: boolean }) {
  return <label>{label}<input name={name} type="number" inputMode="numeric" min={zero ? 0 : 1} max={MAX_MONEY} step="1" defaultValue={value} required /></label>;
}
function Dialog({ title, onClose, busy, children }: { title: string; onClose: () => void; busy: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { dialog?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <dialog ref={ref} className="editor-modal" aria-labelledby="dialog-title" onCancel={e => { if (busy) e.preventDefault(); else onClose(); }}><div className="section-heading"><h2 id="dialog-title">{title}</h2><button className="secondary-button" type="button" disabled={busy} onClick={onClose}>Tutup</button></div>{children}</dialog>;
}
function EditorModal({ editor, data, today, onClose, onSave, onDeleteAccount }: { editor: Editor; data: AccountData; today: string; onClose: () => void; onSave: (action: string, payload: object) => Promise<void>; onDeleteAccount: (f: FormData) => Promise<void> }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [id] = useState(() => editor.kind === 'wallet' ? editor.wallet?.id ?? crypto.randomUUID() : editor.kind === 'entry' ? editor.entry?.id ?? crypto.randomUUID() : '');
  const errorRef = useRef<HTMLParagraphElement>(null);
  const title = editor.kind === 'wallet' ? editor.wallet ? 'Ubah dompet' : 'Tambah dompet' : editor.kind === 'entry' ? `${editor.entry ? 'Ubah' : 'Catat'} ${kinds[editor.entryKind].toLowerCase()}` : editor.kind === 'account' ? 'Hapus akun dan seluruh data' : 'Hapus catatan';
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (busy) return; setBusy(true); setError('');
    try {
      const f = new FormData(e.currentTarget);
      if (editor.kind === 'wallet') {
        const name = String(f.get('name')).trim(); if (!name) throw new Error('Isi nama dompet.');
        await onSave('save_wallet', { id, name, kind: f.get('kind'), opening_balance: money(f.get('opening_balance'), true) });
      } else if (editor.kind === 'entry') {
        const name = String(f.get('name')).trim(), date = String(f.get('date')); if (!name) throw new Error('Isi nama catatan.');
        if (date > today || date < '2000-01-01') throw new Error('Tanggal harus antara 1 Januari 2000 dan hari ini.');
        if (editor.entryKind === 'transfer' && f.get('wallet_id') === f.get('to_wallet_id')) throw new Error('Pilih dompet tujuan yang berbeda.');
        await onSave('save_entry', { id, name, kind: editor.entryKind, amount: money(f.get('amount')), date, wallet_id: f.get('wallet_id'), to_wallet_id: editor.entryKind === 'transfer' ? f.get('to_wallet_id') : null, category: editor.entryKind === 'expense' ? f.get('category') : null });
      } else if (editor.kind === 'delete') await onSave(editor.entity === 'wallet' ? 'delete_wallet' : 'delete_entry', { id: editor.id });
      else await onDeleteAccount(f);
      onClose();
    } catch (e) { setError(e instanceof Error ? e.message : 'Perubahan belum tersimpan.'); requestAnimationFrame(() => errorRef.current?.focus()); } finally { setBusy(false); }
  }
  const noWallet = editor.kind === 'entry' && (data.wallets.length === 0 || (editor.entryKind === 'transfer' && data.wallets.length < 2));
  return <Dialog title={title} busy={busy} onClose={onClose}><form className="stack" onSubmit={submit} aria-busy={busy}><fieldset disabled={busy || noWallet} className="plain-fieldset"><legend className="sr-only">{title}</legend>
    {editor.kind === 'wallet' && <><label>Nama dompet<input name="name" autoComplete="off" maxLength={60} required defaultValue={editor.wallet?.name} /></label><label>Jenis dompet<select name="kind" defaultValue={editor.wallet?.kind ?? 'cash'}>{Object.entries(walletKinds).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><MoneyField label="Saldo awal (Rp)" name="opening_balance" value={editor.wallet?.opening_balance ?? 0} zero /><p className="small-text">Saldo awal adalah uang yang sudah ada sebelum catatan pertama. Untuk uang baru setelah itu, gunakan Catat pemasukan. Jangan masukkan nomor rekening.</p></>}
    {editor.kind === 'entry' && <><label>Nama catatan<input name="name" required maxLength={100} autoComplete="off" defaultValue={editor.entry?.name} /></label><MoneyField label="Nominal (Rp)" name="amount" value={editor.entry?.amount} /><label>Tanggal<input type="date" name="date" required min="2000-01-01" max={today} defaultValue={editor.entry?.date ?? today} /></label><label>{editor.entryKind === 'income' ? 'Dompet penerima' : 'Dompet sumber'}<select name="wallet_id" required defaultValue={editor.entry?.wallet_id ?? data.wallets[0]?.id}>{data.wallets.map(w => <option key={w.id} value={w.id}>{w.name} · {formatRupiah(balance(w, data.entries))}</option>)}</select></label>{editor.entryKind === 'transfer' && <><label>Dompet tujuan<select name="to_wallet_id" required defaultValue={editor.entry?.to_wallet_id ?? data.wallets[1]?.id}>{data.wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label><p className="small-text">Hanya mencatat perpindahan uang yang sudah kamu lakukan. Biaya transfer, jika ada, dicatat terpisah sebagai pengeluaran.</p></>}{editor.entryKind === 'expense' && <label>Kategori<select name="category" required defaultValue={editor.entry?.category ?? 'food'}>{Object.entries(CATEGORY_NAMES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>}<p className="small-text">Isi catatan seperlunya. Jangan masukkan PIN, nomor kartu, atau informasi orang lain.</p></>}
    {editor.kind === 'delete' && <p>Hapus “{editor.name}”? Saldo terkait akan dihitung ulang. Catatan yang dihapus tidak dapat dipulihkan melalui aplikasi.</p>}
    {editor.kind === 'account' && <><p>Seluruh catatan aktif akan dihapus permanen. Unduh data terlebih dahulu jika ingin menyimpannya.</p><label>Kata sandi saat ini<input name="password" type="password" autoComplete="current-password" required /></label><label>Ketik HAPUS untuk mengonfirmasi<input name="confirmation" pattern="HAPUS" autoComplete="off" required /></label></>}
    </fieldset>{noWallet && <p className="notice">{editor.kind === 'entry' && editor.entryKind === 'transfer' ? 'Tambahkan minimal dua dompet melalui halaman Dompet.' : 'Tambahkan dompet terlebih dahulu melalui halaman Dompet.'}</p>}{error && <p ref={errorRef} tabIndex={-1} role="alert" className="notice error">{error}</p>}<div className="actions"><button type="button" className="secondary-button" disabled={busy} onClick={onClose}>Batal</button><button disabled={busy || noWallet} className={editor.kind === 'delete' || editor.kind === 'account' ? 'danger-button' : 'primary-button'}>{busy ? 'Menyimpan…' : editor.kind === 'delete' ? 'Ya, hapus catatan' : editor.kind === 'account' ? 'Hapus akun permanen' : 'Simpan ' + (editor.kind === 'wallet' ? 'dompet' : kinds[editor.entryKind].toLowerCase())}</button></div></form></Dialog>;
}
