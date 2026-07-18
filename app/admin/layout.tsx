import type { Metadata } from 'next';
import '@/app/ui/global.css';

export const metadata: Metadata = {
  title: 'CargoFlow Admin',
  description: 'Fleet management admin console',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-brand-900 text-slate-200 antialiased">{children}</div>;
}
