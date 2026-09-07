import Link from 'next/link';
import SiteFooter from '@/components/site-footer';
export default function NotFound() {
  return <><main id="main-content" className="public-main stack" tabIndex={-1}><h1>Halaman tidak ditemukan</h1><p>Alamat ini tidak tersedia. Kembali ke GoPlan untuk membuka catatanmu.</p><Link href="/">Kembali ke GoPlan</Link></main><SiteFooter /></>;
}
