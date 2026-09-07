import Link from 'next/link';
import { Leaf } from 'lucide-react';
import SiteFooter from '@/components/site-footer';
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return <><header className="public-header"><Link href="/" className="brand"><Leaf aria-hidden="true" />GoPlan</Link><Link href="/">Kembali ke aplikasi</Link></header><main id="main-content" className="public-main legal-copy" tabIndex={-1}>{children}</main><SiteFooter /></>;
}
