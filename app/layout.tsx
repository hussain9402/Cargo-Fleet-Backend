import type { Metadata } from 'next';
import { Syne, Figtree } from 'next/font/google';
import '@/app/ui/global.css';

const display = Syne({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const sans = Figtree({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'FleetFlow — Fleet management for modern operators',
    template: '%s · FleetFlow',
  },
  description:
    'Multi-tenant SaaS fleet platform. Track vehicles, drivers, and trips — with roles that match how your company actually works.',
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png' }],
    apple: [{ url: '/favicon.png', type: 'image/png' }],
    shortcut: '/favicon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
