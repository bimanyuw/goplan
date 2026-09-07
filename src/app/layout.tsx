import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'GoPlan — Your adaptive financial planner', description: 'Your budget adapts when your life does.' };
export default function RootLayout({ children }: Readonly<{
    children: React.ReactNode;
}>) { return <html lang="en"><body>{children}</body></html>; }
