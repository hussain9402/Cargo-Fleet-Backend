"use client";

import { useEffect, useState, type ReactNode } from 'react';
import {
  api,
  roleLabel,
  updateStoredUser,
  type AdminUser,
  type ScopeSettings,
} from '../lib/api';
import { Badge, Button, Card, Field, inputClass, Select } from '../components/ui';
import { PanelSkeleton } from '../components/skeletons';
import { useAdminTheme } from '../components/AdminThemeProvider';

type SettingsTab = 'branding' | 'preferences' | 'profile' | 'smtp';

const NAV: {
  key: SettingsTab;
  label: string;
  hint: string;
  icon: string;
  companyOnly?: boolean;
}[] = [
  { key: 'branding', label: 'Brand', hint: 'Logo & name', icon: '◈', companyOnly: true },
  { key: 'preferences', label: 'Preferences', hint: 'Theme & locale', icon: '◐' },
  { key: 'profile', label: 'Profile', hint: 'Account security', icon: '◎' },
  { key: 'smtp', label: 'Email', hint: 'SMTP delivery', icon: '✉' },
];

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Australia/Sydney',
];

function Notice({ message }: { message: string }) {
  const { resolved } = useAdminTheme();
  const light = resolved === 'light';
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        light
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      }`}
    >
      {message}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  const { resolved } = useAdminTheme();
  const light = resolved === 'light';
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        light
          ? 'border-rose-200 bg-rose-50 text-rose-700'
          : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
      }`}
    >
      {message}
    </div>
  );
}

function Section({
  eyebrow,
  title,
  description,
  children,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const { resolved } = useAdminTheme();
  const light = resolved === 'light';

  return (
    <section
      className={`rounded-2xl border shadow-sm ${
        light
          ? 'border-slate-200/90 bg-white shadow-slate-900/5'
          : 'border-white/[0.08] bg-brand-800/80 shadow-black/10'
      }`}
    >
      <header
        className={`flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4 sm:px-6 ${
          light ? 'border-slate-100' : 'border-white/[0.06]'
        }`}
      >
        <div className="min-w-0 max-w-2xl">
          {eyebrow && (
            <p className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-brand-600">
              {eyebrow}
            </p>
          )}
          <h3
            className={`mt-1 font-display text-xl font-bold tracking-tight ${
              light ? 'text-slate-900' : 'text-white'
            }`}
          >
            {title}
          </h3>
          {description && (
            <p className={`mt-1.5 text-sm leading-relaxed ${light ? 'text-slate-500' : 'text-slate-400'}`}>
              {description}
            </p>
          )}
        </div>
        {action}
      </header>
      <div className="space-y-4 px-5 py-5 sm:px-6 sm:py-5">{children}</div>
    </section>
  );
}

export function SettingsPanel({
  isPlatform,
  user,
  onUserUpdated,
}: {
  isPlatform: boolean;
  user: AdminUser;
  onUserUpdated: (u: AdminUser) => void;
}) {
  const [tab, setTab] = useState<SettingsTab>(isPlatform ? 'preferences' : 'branding');
  const [settings, setSettings] = useState<ScopeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api<{ settings: ScopeSettings }>('/settings');
        setSettings(res.settings);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const tabs = NAV.filter((t) => !(t.companyOnly && isPlatform));
  const { resolved } = useAdminTheme();
  const light = resolved === 'light';

  return (
    <div className="space-y-4">
      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside
          className={`h-fit rounded-2xl border p-2 lg:sticky lg:top-24 ${
            light
              ? 'border-slate-200 bg-white shadow-sm shadow-slate-900/5'
              : 'border-white/[0.08] bg-brand-800'
          }`}
        >
          <p
            className={`px-3 pb-2 pt-2 font-display text-[10px] font-bold uppercase tracking-[0.18em] ${
              light ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Sections
          </p>
          <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {tabs.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`flex min-w-[140px] items-center gap-3 rounded-xl px-3 py-3 text-left transition lg:min-w-0 ${
                    active
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
                      : light
                        ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base ${
                      active
                        ? 'bg-white/15 text-white'
                        : light
                          ? 'bg-brand-50 text-brand-600'
                          : 'bg-white/[0.05] text-brand-300'
                    }`}
                  >
                    {t.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-sm font-bold tracking-tight">{t.label}</span>
                    <span
                      className={`block text-[11px] ${
                        active ? 'text-white/70' : light ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      {t.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 space-y-4">
          {loading ? (
            <PanelSkeleton />
          ) : error ? (
            <ErrorBox message={error} />
          ) : (
            <>
              {tab === 'branding' && !isPlatform && (
                <BrandingTab user={user} onUserUpdated={onUserUpdated} />
              )}
              {tab === 'preferences' && settings && (
                <PreferencesTab settings={settings} onSaved={setSettings} />
              )}
              {tab === 'profile' && (
                <ProfileTab isPlatform={isPlatform} user={user} onUserUpdated={onUserUpdated} />
              )}
              {tab === 'smtp' && settings && <SmtpTab settings={settings} onSaved={setSettings} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BrandingTab({
  user,
  onUserUpdated,
}: {
  user: AdminUser;
  onUserUpdated: (u: AdminUser) => void;
}) {
  const { resolved } = useAdminTheme();
  const light = resolved === 'light';
  const [name, setName] = useState(user.company?.name ?? '');
  const [preview, setPreview] = useState(user.company?.logoUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user.companyId || !user.company) {
    return <ErrorBox message="No company linked to this account." />;
  }

  async function saveName() {
    if (!user.companyId) return;
    setBusy(true);
    setSaved(false);
    setError(null);
    try {
      const res = await api<{ company: NonNullable<AdminUser['company']> }>(
        `/companies/${user.companyId}`,
        { method: 'PATCH', body: JSON.stringify({ name: name.trim() }) },
      );
      const updated: AdminUser = { ...user, company: res.company };
      updateStoredUser(updated);
      onUserUpdated(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save name');
    } finally {
      setBusy(false);
    }
  }

  async function onLogoPick(file: File | null) {
    if (!file || !user.companyId) return;
    setUploading(true);
    setError(null);
    setSaved(false);
    try {
      const token =
        typeof window !== 'undefined' ? window.localStorage.getItem('cf_admin_access') : null;
      const form = new FormData();
      form.append('logo', file);
      const res = await fetch(`/api/v1/companies/${user.companyId}/logo`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Upload failed');
      const company = (data as { company: NonNullable<AdminUser['company']> }).company;
      setPreview(company.logoUrl);
      const updated: AdminUser = { ...user, company };
      updateStoredUser(updated);
      onUserUpdated(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to upload logo');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      {saved && <Notice message="Brand updated for sidebar, tab title, and emails." />}
      {error && <ErrorBox message={error} />}

      <div className="grid gap-4 xl:grid-cols-2">
        <Section
          eyebrow="Identity"
          title="Company logo"
          description="Used in the admin sidebar, browser tab, and outbound emails."
          action={
            <label className="inline-flex cursor-pointer items-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500">
              {uploading ? 'Uploading…' : 'Upload logo'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                disabled={uploading}
                onChange={(e) => onLogoPick(e.target.files?.[0] ?? null)}
              />
            </label>
          }
        >
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div
              className={`flex h-28 w-full max-w-[220px] items-center justify-center rounded-2xl border border-dashed p-4 ${
                light
                  ? 'border-brand-300 bg-brand-50'
                  : 'border-brand-500/30 bg-brand-950/50'
              }`}
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt={name || 'Logo'} className="max-h-full max-w-full object-contain" />
              ) : (
                <div className="text-center">
                  <p className="font-display text-sm font-bold text-slate-300">No logo yet</p>
                  <p className="mt-1 text-xs text-slate-500">PNG · JPEG · WebP · SVG · 2MB</p>
                </div>
              )}
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-slate-400">
              Prefer a transparent PNG or SVG. Wide wordmarks and square icons both work.
            </p>
          </div>
        </Section>

        <Section
          eyebrow="Naming"
          title="Display name"
          description="Shown across the console for your company."
          action={
            <Button onClick={saveName} disabled={busy || !name.trim()}>
              {busy ? 'Saving…' : 'Save name'}
            </Button>
          }
        >
          <Field label="Company name">
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Northline Freight"
            />
          </Field>
          <div
            className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${
              light ? 'border-slate-200 bg-slate-50' : 'border-white/[0.06] bg-white/[0.03]'
            }`}
          >
            <span className="text-sm text-slate-400">Status</span>
            <Badge tone={user.company.status === 'active' ? 'green' : 'red'}>{user.company.status}</Badge>
            <span className="text-xs text-slate-500">Only the platform admin can change this</span>
          </div>
        </Section>
      </div>
    </div>
  );
}

function PreferencesTab({
  settings,
  onSaved,
}: {
  settings: ScopeSettings;
  onSaved: (s: ScopeSettings) => void;
}) {
  const { setMode, resolved } = useAdminTheme();
  const light = resolved === 'light';
  const [timezone, setTimezone] = useState(settings.timezone);
  const [locale, setLocale] = useState(settings.locale);
  const [theme, setTheme] = useState(settings.theme);
  const [weeklyReport, setWeeklyReport] = useState(settings.weeklyReport);
  const [itemsPerPage, setItemsPerPage] = useState(settings.itemsPerPage);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    setSaved(false);
    try {
      const res = await api<{ settings: ScopeSettings }>('/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          timezone,
          locale,
          theme,
          weeklyReport,
          itemsPerPage: Number(itemsPerPage),
        }),
      });
      onSaved(res.settings);
      setMode(res.settings.theme);
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  const themes: { value: 'system' | 'light' | 'dark'; label: string; desc: string }[] = [
    { value: 'system', label: 'System', desc: 'Match your device' },
    { value: 'light', label: 'Light', desc: 'Bright workspace' },
    { value: 'dark', label: 'Dark', desc: 'Low-glare console' },
  ];
  const tzOptions = TIMEZONES.includes(timezone) ? TIMEZONES : [timezone, ...TIMEZONES];

  return (
    <div className="space-y-4">
      {saved && <Notice message="Preferences saved." />}

      <div className="grid gap-4 xl:grid-cols-2">
        <Section
          eyebrow="Look & feel"
          title="Appearance"
          description="Pick a theme. Changes apply immediately; save to keep them."
        >
          <div className="grid gap-2.5 sm:grid-cols-3">
            {themes.map((t) => {
              const active = theme === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => {
                    setTheme(t.value);
                    setMode(t.value);
                  }}
                  className={`rounded-2xl border p-3 text-left transition ${
                    active
                      ? light
                        ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/30'
                        : 'border-brand-500 bg-brand-600/15 ring-2 ring-brand-600/40'
                      : light
                        ? 'border-slate-200 bg-slate-50 hover:border-slate-300'
                        : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20'
                  }`}
                >
                  <div
                    className={`mb-3 h-12 overflow-hidden rounded-lg border ${
                      t.value === 'light'
                        ? 'border-slate-200 bg-[#f4f6fb]'
                        : t.value === 'dark'
                          ? 'border-slate-700 bg-[#0a0a0a]'
                          : 'border-slate-300 bg-gradient-to-br from-[#0a0a0a] via-[#1a52c4]/40 to-[#f4f6fb]'
                    }`}
                  >
                    <div className="m-2 h-2 w-8 rounded-full bg-brand-500" />
                    <div
                      className={`mx-2 h-1.5 w-14 rounded-full ${
                        t.value === 'light' ? 'bg-slate-300' : 'bg-white/25'
                      }`}
                    />
                  </div>
                  <p className={`font-display text-sm font-bold ${light ? 'text-slate-900' : 'text-white'}`}>
                    {t.label}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{t.desc}</p>
                </button>
              );
            })}
          </div>
        </Section>

        <Section
          eyebrow="Regional"
          title="Locale & lists"
          description="Defaults used across tables and reports."
          action={
            <Button onClick={save} disabled={busy}>
              {busy ? 'Saving…' : 'Save preferences'}
            </Button>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Timezone">
              <Select
                value={timezone}
                onChange={setTimezone}
                options={tzOptions.map((tz) => ({ value: tz, label: tz }))}
              />
            </Field>
            <Field label="Language">
              <Select
                value={locale}
                onChange={setLocale}
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'ur', label: 'Urdu' },
                  { value: 'ar', label: 'Arabic' },
                  { value: 'es', label: 'Spanish' },
                ]}
              />
            </Field>
            <Field label="Rows per page">
              <Select
                value={String(itemsPerPage)}
                onChange={(v) => setItemsPerPage(Number(v))}
                options={[10, 25, 50, 100].map((n) => ({ value: String(n), label: `${n} rows` }))}
              />
            </Field>
            <div className="flex items-end">
              <label
                className={`flex w-full cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-2.5 transition ${
                  light
                    ? 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
              >
                <input
                  type="checkbox"
                  className={`mt-0.5 h-4 w-4 rounded text-brand-600 ${
                    light ? 'border-slate-300 bg-white' : 'border-white/20 bg-brand-900'
                  }`}
                  checked={weeklyReport}
                  onChange={(e) => setWeeklyReport(e.target.checked)}
                />
                <span>
                  <span
                    className={`block text-sm font-semibold ${light ? 'text-slate-900' : 'text-slate-100'}`}
                  >
                    Weekly summary email
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">Monday digest of fleet activity</span>
                </span>
              </label>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

function ProfileTab({
  isPlatform,
  user,
  onUserUpdated,
}: {
  isPlatform: boolean;
  user: AdminUser;
  onUserUpdated: (u: AdminUser) => void;
}) {
  const [name, setName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState(user.company?.name ?? '');
  const [coBusy, setCoBusy] = useState(false);
  const [coSaved, setCoSaved] = useState(false);

  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const { resolved } = useAdminTheme();
  const light = resolved === 'light';

  async function saveAccount() {
    setBusy(true);
    setSaved(false);
    setError(null);
    try {
      const payload: Record<string, unknown> = { name };
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }
      const res = await api<{ user: AdminUser }>('/account', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      if (res.user) {
        updateStoredUser(res.user);
        onUserUpdated(res.user);
      }
      setCurrentPassword('');
      setNewPassword('');
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save');
    } finally {
      setBusy(false);
    }
  }

  async function saveCompany() {
    if (!user.companyId) return;
    setCoBusy(true);
    setCoSaved(false);
    try {
      const res = await api<{ company: NonNullable<AdminUser['company']> }>(
        `/companies/${user.companyId}`,
        { method: 'PATCH', body: JSON.stringify({ name: companyName.trim() }) },
      );
      const updated: AdminUser = { ...user, company: res.company };
      updateStoredUser(updated);
      onUserUpdated(updated);
      setCoSaved(true);
    } finally {
      setCoBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {saved && <Notice message="Account updated." />}
      {error && <ErrorBox message={error} />}
      {coSaved && <Notice message="Company profile saved." />}

      <div className="grid gap-4 xl:grid-cols-2">
        <Section
          eyebrow="Account"
          title="Your profile"
          description="Details for the signed-in admin user."
          action={
            <Button onClick={saveAccount} disabled={busy}>
              {busy ? 'Saving…' : 'Save account'}
            </Button>
          }
        >
          <div
            className={`mb-2 flex items-center gap-3 rounded-xl border p-3 ${
              light
                ? 'border-slate-200 bg-gradient-to-r from-brand-50 to-white'
                : 'border-white/[0.08] bg-gradient-to-r from-brand-600/10 to-transparent'
            }`}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 font-display text-base font-bold text-white shadow-md shadow-brand-600/30">
              {initials}
            </div>
            <div className="min-w-0">
              <p className={`truncate font-display text-base font-bold ${light ? 'text-slate-900' : 'text-white'}`}>
                {user.name}
              </p>
              <p className={`truncate text-xs ${light ? 'text-slate-500' : 'text-slate-400'}`}>{user.email}</p>
              <p className={`mt-0.5 text-xs font-medium ${light ? 'text-brand-600' : 'text-brand-300'}`}>
                {roleLabel(user.role)}
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name">
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Email">
              <input className={`${inputClass} cursor-not-allowed opacity-60`} value={user.email} disabled />
            </Field>
          </div>
        </Section>

        <Section
          eyebrow="Security"
          title="Password"
          description="Leave blank to keep your current password."
          action={
            <Button onClick={saveAccount} disabled={busy || (!!newPassword && !currentPassword)}>
              {busy ? 'Saving…' : 'Update password'}
            </Button>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Current password">
              <input
                className={inputClass}
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
            <Field label="New password">
              <input
                className={inputClass}
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </Field>
          </div>
        </Section>
      </div>

      {!isPlatform && user.company && (
        <Section
          eyebrow="Company"
          title="Company profile"
          description="For logo uploads, use the Brand section."
          action={
            <Button onClick={saveCompany} disabled={coBusy || !companyName.trim()}>
              {coBusy ? 'Saving…' : 'Save company'}
            </Button>
          }
        >
          <Field label="Company name">
            <input
              className={inputClass}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </Field>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">Status</span>
            <Badge tone={user.company.status === 'active' ? 'green' : 'red'}>{user.company.status}</Badge>
          </div>
        </Section>
      )}
    </div>
  );
}

function SmtpTab({
  settings,
  onSaved,
}: {
  settings: ScopeSettings;
  onSaved: (s: ScopeSettings) => void;
}) {
  const [host, setHost] = useState(settings.smtpHost ?? '');
  const [port, setPort] = useState(settings.smtpPort ?? 587);
  const [secure, setSecure] = useState(settings.smtpSecure);
  const [smtpUser, setSmtpUser] = useState(settings.smtpUser ?? '');
  const [password, setPassword] = useState('');
  const [from, setFrom] = useState(settings.smtpFrom ?? '');
  const [fromName, setFromName] = useState(settings.smtpFromName ?? '');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const { resolved } = useAdminTheme();
  const light = resolved === 'light';

  async function save() {
    setBusy(true);
    setSaved(false);
    try {
      const payload: Record<string, unknown> = {
        smtpHost: host,
        smtpPort: Number(port),
        smtpSecure: secure,
        smtpUser,
        smtpFrom: from,
        smtpFromName: fromName,
      };
      if (password) payload.smtpPassword = password;
      const res = await api<{ settings: ScopeSettings }>('/settings', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      onSaved(res.settings);
      setPassword('');
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {saved && <Notice message="SMTP settings saved." />}

      <Section
        eyebrow="Delivery"
        title="SMTP"
        description="Used for invitations, password resets, OTP codes, and reports."
        action={
          <Button onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save SMTP'}
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="SMTP host">
            <input
              className={inputClass}
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="smtp.gmail.com"
            />
          </Field>
          <Field label="Port">
            <input
              type="number"
              className={inputClass}
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
            />
          </Field>
          <Field label="Username">
            <input className={inputClass} value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} />
          </Field>
          <Field label={settings.smtpPasswordSet ? 'Password (leave blank to keep)' : 'Password'}>
            <input
              type="password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={settings.smtpPasswordSet ? '••••••••' : ''}
              autoComplete="new-password"
            />
          </Field>
          <Field label="From email">
            <input
              className={inputClass}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="noreply@yourcompany.com"
            />
          </Field>
          <Field label="From name">
            <input
              className={inputClass}
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="FleetFlow"
            />
          </Field>
          <div className="sm:col-span-2">
            <label
              className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 ${
                light ? 'border-slate-200 bg-slate-50' : 'border-white/[0.08] bg-white/[0.02]'
              }`}
            >
              <input
                type="checkbox"
                className={`h-4 w-4 rounded text-brand-600 ${
                  light ? 'border-slate-300 bg-white' : 'border-white/20 bg-brand-900'
                }`}
                checked={secure}
                onChange={(e) => setSecure(e.target.checked)}
              />
              <span className={`text-sm font-medium ${light ? 'text-slate-800' : 'text-slate-200'}`}>
                Use TLS / SSL
              </span>
            </label>
          </div>
          {settings.smtpPasswordSet && (
            <p className="sm:col-span-2 text-xs text-emerald-400">
              A password is already saved for this workspace.
            </p>
          )}
        </div>
      </Section>
    </div>
  );
}
