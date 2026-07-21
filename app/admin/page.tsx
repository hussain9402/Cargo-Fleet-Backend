"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken, logout, roleLabel, type AdminUser } from './lib/api';
import { SuperAdminPanel } from './panels/SuperAdminPanel';
import { CompanyPanel } from './panels/CompanyPanel';
import {
  AuditPanel,
  BroadcastsPanel,
  CompanyReports,
  ContactPanel,
  PlatformReports,
  RolesPanel,
} from './panels/shared';
import { SettingsPanel } from './panels/SettingsPanel';
import { NavIcon } from './components/icons';
import { BrandMark, useCompanyBrand } from './components/BrandMark';
import { AdminShellSkeleton } from './components/skeletons';
import { NotificationBell } from './components/NotificationBell';

type NavItem = { key: string; label: string; icon: string };

const SUPER_NAV: NavItem[] = [
  { key: 'overview', label: 'Overview', icon: 'overview' },
  { key: 'companies', label: 'Companies', icon: 'companies' },
  { key: 'users', label: 'Users', icon: 'users' },
  { key: 'roles', label: 'Roles', icon: 'roles' },
  { key: 'broadcasts', label: 'Broadcasts', icon: 'broadcasts' },
  { key: 'contact', label: 'Contact inbox', icon: 'contact' },
  { key: 'reports', label: 'Reports', icon: 'reports' },
  { key: 'audit', label: 'Audit log', icon: 'audit' },
  { key: 'settings', label: 'Settings', icon: 'settings' },
];

const COMPANY_NAV: NavItem[] = [
  { key: 'overview', label: 'Dashboard', icon: 'overview' },
  { key: 'users', label: 'Team', icon: 'users' },
  { key: 'roles', label: 'Roles', icon: 'roles' },
  { key: 'vehicles', label: 'Vehicles', icon: 'vehicles' },
  { key: 'drivers', label: 'Drivers', icon: 'drivers' },
  { key: 'trips', label: 'Trips', icon: 'trips' },
  { key: 'broadcasts', label: 'Broadcasts', icon: 'broadcasts' },
  { key: 'contact', label: 'Contact us', icon: 'contact' },
  { key: 'reports', label: 'Reports', icon: 'reports' },
  { key: 'audit', label: 'Audit log', icon: 'audit' },
  { key: 'settings', label: 'Settings', icon: 'settings' },
];

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState('overview');

  const isPlatformPreview =
    !!user && (user.role === 'super_admin' || user.roles.includes('super_admin'));
  const navPreview = isPlatformPreview ? SUPER_NAV : COMPANY_NAV;
  const currentLabelPreview = navPreview.find((n) => n.key === section)?.label ?? 'Overview';
  const brand = useCompanyBrand(user, currentLabelPreview);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/admin/login');
      return;
    }
    (async () => {
      try {
        const res = await api<{ user: AdminUser }>('/auth/me');
        setUser(res.user);
      } catch {
        logout();
        router.replace('/admin/login');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <AdminShellSkeleton />;
  }
  if (!user) return null;

  const isPlatform = user.role === 'super_admin' || user.roles.includes('super_admin');
  const canManageCompany = isPlatform || user.roles.includes('company_owner');

  if (!canManageCompany) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-900 p-6">
        <div className="max-w-md rounded-2xl border border-white/[0.06] bg-brand-800 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-2xl">
            ⚠️
          </div>
          <h2 className="mb-2 text-lg font-semibold text-white">No admin access</h2>
          <p className="text-sm text-slate-400">
            Your role ({roleLabel(user.role)}) doesn&apos;t have access to the web console. Please use the
            mobile app.
          </p>
          <button
            onClick={() => {
              logout();
              router.replace('/admin/login');
            }}
            className="mt-5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const nav = isPlatform ? SUPER_NAV : COMPANY_NAV;
  const panelName = isPlatform ? 'Platform Console' : user.company?.name ?? 'Company Console';
  const currentLabel = nav.find((n) => n.key === section)?.label ?? 'Overview';
  const initials = user.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  function renderSection() {
    if (!user) return null;
    switch (section) {
      case 'roles':
        return <RolesPanel />;
      case 'broadcasts':
        return <BroadcastsPanel isPlatform={isPlatform} />;
      case 'contact':
        return <ContactPanel isPlatform={isPlatform} />;
      case 'reports':
        return isPlatform ? <PlatformReports /> : <CompanyReports />;
      case 'audit':
        return <AuditPanel />;
      case 'settings':
        return <SettingsPanel isPlatform={isPlatform} user={user} onUserUpdated={setUser} />;
      default:
        return isPlatform ? (
          <SuperAdminPanel section={section as never} />
        ) : (
          <CompanyPanel section={section as never} user={user} />
        );
    }
  }

  return (
    <div className="flex min-h-screen bg-brand-900 text-slate-200">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 flex w-[260px] flex-col border-r border-white/[0.06] bg-brand-950 font-display">
        <div className="flex items-center gap-3.5 px-5 py-5">
          <BrandMark user={user} className="h-14 w-14 shrink-0 rounded-xl object-contain" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold leading-tight tracking-tight text-white">
              {brand.name}
            </p>
            <p className="mt-0.5 truncate text-xs font-semibold tracking-wide text-slate-500">
              {isPlatform ? 'SaaS Platform' : 'Company Admin'}
            </p>
          </div>
        </div>

        <div className="px-4 pb-2 pt-2">
          <p className="px-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-600">Menu</p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 pb-4">
          {nav.map((item) => {
            const active = section === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setSection(item.key)}
                className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-bold tracking-tight transition-all ${
                  active
                    ? 'bg-brand-600/8 text-brand-300'
                    : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-600" />
                )}
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                    active
                      ? 'bg-brand-600/12 text-brand-300'
                      : 'bg-white/[0.03] text-slate-400 group-hover:bg-white/[0.06] group-hover:text-slate-200'
                  }`}
                >
                  <NavIcon name={item.icon} />
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/[0.06] p-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-800 text-xs font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold tracking-tight text-white">{user.name}</p>
              <p className="truncate text-xs font-semibold text-slate-500">{roleLabel(user.role)}</p>
            </div>
          </div>
          <button
            onClick={async () => {
              await logout();
              router.replace('/admin/login');
            }}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.06] px-3 py-2 text-sm font-bold tracking-tight text-slate-400 transition hover:bg-white/[0.04] hover:text-slate-200"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-[260px] flex-1">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.06] bg-brand-900/80 px-4 py-3.5 backdrop-blur-xl lg:px-6">
          <div>
            <p className="text-sm font-medium text-slate-500">{panelName}</p>
            <h1 className="text-2xl font-semibold tracking-tight text-white">{currentLabel}</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden h-10 items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 md:flex">
              <span className="shrink-0 text-slate-500">⌕</span>
              <input
                placeholder="Search…"
                className="w-40 border-0 bg-transparent p-0 text-sm text-slate-200 shadow-none outline-none ring-0 placeholder:text-slate-500 focus:border-0 focus:outline-none focus:ring-0"
              />
            </div>
            <NotificationBell onViewAll={() => setSection('broadcasts')} />
            <div className="flex h-10 items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] py-0 pl-1 pr-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 text-xs font-bold text-white">
                {initials}
              </div>
              <div className="hidden leading-tight sm:block">
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="text-xs text-slate-500">{roleLabel(user.role)}</p>
              </div>
            </div>
          </div>
        </header>
        <div className="px-4 py-7 lg:px-6">{renderSection()}</div>
      </main>
    </div>
  );
}
