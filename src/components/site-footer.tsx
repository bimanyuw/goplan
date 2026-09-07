import Link from 'next/link';
export default function SiteFooter() {
  return <footer className="site-footer"><div><strong>GoPlan</strong><p>Proyek kompetisi independen · Indonesia · Gratis</p><p>Tidak berafiliasi dengan Gojek atau GoTo.</p></div>
    <nav aria-label="Informasi layanan"><Link href="/about">Tentang & kontak</Link><Link href="/privacy">Privasi</Link><Link href="/terms">Syarat penggunaan</Link><Link href="/refund">Pengembalian dana</Link><Link href="/cookies">Cookie & penyimpanan</Link><Link href="/accessibility">Aksesibilitas</Link></nav>
  </footer>;
}
