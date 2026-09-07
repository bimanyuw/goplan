import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'GoPlan — Catatan keuangan mahasiswa', template: '%s | GoPlan' },
  description: 'Catat pemasukan, pengeluaran, dompet, dan anggaran bulananmu. Proyek kompetisi independen, gratis untuk digunakan.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body><a className="skip-link" href="#main-content">Lewati ke konten utama</a>{children}</body></html>;
}
