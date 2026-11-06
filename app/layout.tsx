import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Sidequest — find your missing piece',
  description: 'A little help. A lot of momentum. A wallet-owned, expiring task board for builders and agents, powered by Arkiv.',
  icons: { icon: '/favicon.svg' },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
