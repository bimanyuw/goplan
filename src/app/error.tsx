'use client';
import Link from 'next/link';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main id="main-content" className="public-main stack" tabIndex={-1}><h1>Halaman belum dapat ditampilkan</h1><p>Coba buka kembali halaman ini. Perubahan yang belum dikonfirmasi tersimpan mungkin perlu diperiksa.</p><button className="primary-button" onClick={reset}>Coba muat halaman lagi</button><Link href="/">Kembali ke GoPlan</Link></main>;
}
