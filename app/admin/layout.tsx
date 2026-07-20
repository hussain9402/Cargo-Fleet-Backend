import type { Metadata } from 'next';
import '@/app/ui/global.css';

export const metadata: Metadata = {
  // absolute avoids the root template appending "· FleetFlow"
  title: {
    absolute: 'Admin',
  },
  description: 'Fleet management admin console',
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png' }],
    apple: [{ url: '/favicon.png', type: 'image/png' }],
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-theme min-h-screen bg-brand-900 text-slate-200 antialiased">{children}</div>
  );
}
