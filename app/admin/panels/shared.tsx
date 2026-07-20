"use client";

import { useEffect, useState } from 'react';
import {
  api,
  roleLabel,
  updateStoredUser,
  type AdminUser,
  type Broadcast,
  type Company,
  type ContactMessage,
  type ManagedUser,
  type RoleInfo,
  type ScopeSettings,
} from '../lib/api';
import { Badge, Button, Card, EmptyState, Field, inputClass, Modal, StatCard } from '../components/ui';

function Loading() {
  return <div className="py-16 text-center text-slate-400">Loading…</div>;
}
function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
      {message}
    </div>
  );
}
function Notice({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
      {message}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Roles & permissions                                                 */
/* ------------------------------------------------------------------ */

const ROLE_META: Record<string, { icon: string; desc: string; chip: string; ring: string }> = {
  super_admin: { icon: '👑', desc: 'Full control across the entire platform', chip: 'bg-brand-600/12 text-brand-300', ring: 'ring-brand-600/20' },
  company_owner: { icon: '🏢', desc: 'Owns and manages the whole company', chip: 'bg-indigo-500/15 text-indigo-300', ring: 'ring-indigo-500/20' },
  fleet_manager: { icon: '🚚', desc: 'Manages vehicles, drivers and trips', chip: 'bg-sky-500/15 text-sky-300', ring: 'ring-sky-500/20' },
  dispatcher: { icon: '🗺️', desc: 'Assigns routes and tracks trips', chip: 'bg-amber-500/15 text-amber-300', ring: 'ring-amber-500/20' },
  driver_manager: { icon: '🧑‍✈️', desc: 'Oversees drivers and performance', chip: 'bg-emerald-500/15 text-emerald-300', ring: 'ring-emerald-500/20' },
  maintenance_manager: { icon: '🔧', desc: 'Handles vehicle servicing & repairs', chip: 'bg-rose-500/15 text-rose-300', ring: 'ring-rose-500/20' },
  finance_manager: { icon: '💰', desc: 'Billing, invoices and finance reports', chip: 'bg-brand-700/25 text-brand-300', ring: 'ring-brand-700/30' },
  customer_support: { icon: '🎧', desc: 'Handles tickets and customer queries', chip: 'bg-sky-500/15 text-sky-300', ring: 'ring-sky-500/20' },
  driver: { icon: '🚛', desc: 'Drives trips and reports status', chip: 'bg-indigo-500/15 text-indigo-300', ring: 'ring-indigo-500/20' },
  customer: { icon: '📦', desc: 'Tracks shipments and invoices', chip: 'bg-white/[0.06] text-slate-300', ring: 'ring-white/10' },
};

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const prettyResource = (r: string) => r.split(/[_-]/).map(cap).join(' ');

function groupPermissions(perms: string[]): { resource: string; actions: string[] }[] {
  const map = new Map<string, string[]>();
  for (const p of perms) {
    const [resource, action = 'access'] = p.split(':');
    if (!map.has(resource)) map.set(resource, []);
    map.get(resource)!.push(action);
  }
  return Array.from(map.entries()).map(([resource, actions]) => ({ resource, actions }));
}

export function RolesPanel() {
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api<{ roles: RoleInfo[] }>('/roles');
        setRoles(res.roles);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;

  const totalUsers = roles.reduce((sum, r) => sum + r.userCount, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Roles &amp; permissions</h2>
          <p className="mt-1 text-sm text-slate-400">
            Roles are defined by the platform. Assign them to people in the Users section.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-sm text-slate-300">
            <span className="font-semibold text-white">{roles.length}</span> roles
          </span>
          <span className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-sm text-slate-300">
            <span className="font-semibold text-white">{totalUsers}</span> assigned users
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((r) => {
          const meta = ROLE_META[r.role] ?? ROLE_META.customer;
          const fullAccess = r.permissions.includes('*');
          const groups = fullAccess ? [] : groupPermissions(r.permissions);
          return (
            <Card key={r.role} className="flex flex-col p-5">
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ring-1 ring-inset ${meta.chip} ${meta.ring}`}
                >
                  {meta.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-white">{roleLabel(r.role)}</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{meta.desc}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                    r.userCount > 0 ? 'bg-white/[0.06] text-slate-200 ring-white/10' : 'bg-white/[0.02] text-slate-500 ring-white/5'
                  }`}
                >
                  {r.userCount} {r.userCount === 1 ? 'user' : 'users'}
                </span>
              </div>

              <div className="mt-4 border-t border-white/[0.06] pt-4">
                {fullAccess ? (
                  <div className="flex items-center gap-2 rounded-lg bg-brand-600/8 px-3 py-2.5 text-sm font-medium text-brand-300 ring-1 ring-inset ring-brand-600/20">
                    <span>✦</span> Full access to every module
                  </div>
                ) : (
                  <>
                    <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {r.permissions.length} permissions · {groups.length} modules
                    </p>
                    <div className="space-y-1.5">
                      {groups.map((g) => (
                        <div
                          key={g.resource}
                          className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-3 py-1.5"
                        >
                          <span className="text-sm font-medium text-slate-200">{prettyResource(g.resource)}</span>
                          <div className="flex flex-wrap justify-end gap-1">
                            {g.actions.map((a) => (
                              <span
                                key={a}
                                className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400"
                              >
                                {a}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Broadcasts                                                          */
/* ------------------------------------------------------------------ */

export function BroadcastsPanel({ isPlatform }: { isPlatform: boolean }) {
  const [items, setItems] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [title, setTitle] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [audience, setAudience] = useState('all');
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api<{ broadcasts: Broadcast[] }>('/broadcasts');
      setItems(res.broadcasts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function send() {
    if (!title.trim() || !bodyText.trim()) return;
    setBusy(true);
    try {
      await api('/broadcasts', {
        method: 'POST',
        body: JSON.stringify({ title, body: bodyText, audience }),
      });
      setTitle('');
      setBodyText('');
      setShow(false);
      load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this broadcast?')) return;
    await api(`/broadcasts/${id}`, { method: 'DELETE' });
    load();
  }

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Broadcasts</h2>
          <p className="text-sm text-slate-400">
            {isPlatform
              ? 'Announcements sent to every company on the platform.'
              : 'Announcements sent to your company members.'}
          </p>
        </div>
        <Button onClick={() => setShow(true)}>+ New broadcast</Button>
      </div>

      <div className="space-y-3">
        {items.map((b) => (
          <Card key={b.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-100">{b.title}</h3>
                <p className="mt-1 text-sm text-slate-300">{b.body}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                  <Badge tone="slate">{b.audience === 'all' ? 'All users' : roleLabel(b.audience as never)}</Badge>
                  <span>{new Date(b.createdAt).toLocaleString()}</span>
                </div>
              </div>
              <Button variant="ghost" onClick={() => remove(b.id)}>
                Delete
              </Button>
            </div>
          </Card>
        ))}
        {items.length === 0 && <EmptyState message="No broadcasts sent yet." />}
      </div>

      {show && (
        <Modal title="New broadcast" onClose={() => setShow(false)}>
          <div className="space-y-4">
            <Field label="Title">
              <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="Message">
              <textarea
                className={inputClass}
                rows={4}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
              />
            </Field>
            {!isPlatform && (
              <Field label="Audience">
                <select className={inputClass} value={audience} onChange={(e) => setAudience(e.target.value)}>
                  <option value="all">All members</option>
                  <option value="fleet_manager">Fleet Managers</option>
                  <option value="dispatcher">Dispatchers</option>
                  <option value="driver">Drivers</option>
                </select>
              </Field>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShow(false)}>
                Cancel
              </Button>
              <Button onClick={send} disabled={busy}>
                {busy ? 'Sending…' : 'Send'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Contact us                                                          */
/* ------------------------------------------------------------------ */

export function ContactPanel({ isPlatform }: { isPlatform: boolean }) {
  const [items, setItems] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api<{ messages: ContactMessage[] }>('/contact');
      setItems(res.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function submit() {
    if (!subject.trim() || !message.trim()) return;
    setBusy(true);
    try {
      await api('/contact', { method: 'POST', body: JSON.stringify({ subject, message }) });
      setSubject('');
      setMessage('');
      setShow(false);
      load();
    } finally {
      setBusy(false);
    }
  }

  async function toggle(m: ContactMessage) {
    await api(`/contact/${m.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: m.status === 'open' ? 'resolved' : 'open' }),
    });
    load();
  }

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{isPlatform ? 'Contact inbox' : 'Contact us'}</h2>
          <p className="text-sm text-slate-400">
            {isPlatform
              ? 'Messages sent by companies to the platform team.'
              : 'Send a message to the platform support team.'}
          </p>
        </div>
        {!isPlatform && <Button onClick={() => setShow(true)}>+ New message</Button>}
      </div>

      <div className="space-y-3">
        {items.map((m) => (
          <Card key={m.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-100">{m.subject}</h3>
                  <Badge tone={m.status === 'open' ? 'amber' : 'green'}>{m.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-300">{m.message}</p>
                <p className="mt-2 text-xs text-slate-400">
                  {isPlatform && (m.companyName ?? 'Platform')} · {m.email} ·{' '}
                  {new Date(m.createdAt).toLocaleString()}
                </p>
              </div>
              <Button variant="secondary" onClick={() => toggle(m)}>
                {m.status === 'open' ? 'Mark resolved' : 'Reopen'}
              </Button>
            </div>
          </Card>
        ))}
        {items.length === 0 && (
          <EmptyState message={isPlatform ? 'No messages received.' : 'You have not sent any messages.'} />
        )}
      </div>

      {show && (
        <Modal title="Contact platform support" onClose={() => setShow(false)}>
          <div className="space-y-4">
            <Field label="Subject">
              <input className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)} />
            </Field>
            <Field label="Message">
              <textarea
                className={inputClass}
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShow(false)}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={busy}>
                {busy ? 'Sending…' : 'Send message'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Audit log                                                           */
/* ------------------------------------------------------------------ */

type AuditLog = {
  id: string;
  company_id: string | null;
  user_id: string | null;
  action: string;
  resource: string | null;
  ip: string | null;
  created_at: string;
};

export function AuditPanel() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api<{ logs: AuditLog[] }>('/audit');
        setLogs(res.logs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Audit log</h2>
      <Card>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/[0.06] text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Resource</th>
              <th className="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-white/[0.04] last:border-0">
                <td className="px-4 py-3 text-slate-400">{new Date(l.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 font-medium text-slate-100">{l.action}</td>
                <td className="px-4 py-3 text-slate-400">{l.resource ?? '—'}</td>
                <td className="px-4 py-3 text-slate-400">{l.ip ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <EmptyState message="No audit entries yet." />}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Settings (Preferences / Profile / SMTP)                             */
/* ------------------------------------------------------------------ */

type SettingsTab = 'branding' | 'preferences' | 'profile' | 'smtp';

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

  async function load() {
    setLoading(true);
    try {
      const res = await api<{ settings: ScopeSettings }>('/settings');
      setSettings(res.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const tabs: { key: SettingsTab; label: string }[] = [
    ...(!isPlatform ? [{ key: 'branding' as const, label: 'Company brand' }] : []),
    { key: 'preferences', label: 'Preferences' },
    { key: 'profile', label: 'Profile' },
    { key: 'smtp', label: 'SMTP / Email' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Settings</h2>
        <p className="text-sm text-slate-400">
          {isPlatform ? 'Platform-level configuration.' : 'Configuration for your company only.'}
        </p>
      </div>

      <div className="flex gap-1 border-b border-white/[0.06]">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
              tab === t.key
                ? 'border-brand-600 text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading />
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
  );
}

function BrandingTab({
  user,
  onUserUpdated,
}: {
  user: AdminUser;
  onUserUpdated: (u: AdminUser) => void;
}) {
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
        {
          method: 'PATCH',
          body: JSON.stringify({ name: name.trim() }),
        },
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
    <Card className="max-w-3xl space-y-6 p-6">
      {saved && <Notice message="Company brand updated. Sidebar, tab title, and emails will use it." />}
      {error && <ErrorBox message={error} />}

      <div>
        <h3 className="font-semibold text-slate-100">Company brand</h3>
        <p className="mt-1 text-sm text-slate-400">
          Name and logo appear in your admin sidebar, browser tab, and outbound emails for your company.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <div className="flex h-24 w-40 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-brand-950/60 p-3">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={name || 'Logo'} className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-xs text-slate-500">No logo yet</span>
          )}
        </div>
        <div className="space-y-2">
          <label className="inline-flex cursor-pointer items-center rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500">
            {uploading ? 'Uploading…' : 'Upload logo'}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              disabled={uploading}
              onChange={(e) => onLogoPick(e.target.files?.[0] ?? null)}
            />
          </label>
          <p className="text-xs text-slate-500">PNG, JPEG, WebP or SVG · max 2MB</p>
        </div>
      </div>

      <Field label="Company display name">
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Northline Freight"
        />
      </Field>

      <Button onClick={saveName} disabled={busy || !name.trim()}>
        {busy ? 'Saving…' : 'Save company name'}
      </Button>
    </Card>
  );
}

function PreferencesTab({
  settings,
  onSaved,
}: {
  settings: ScopeSettings;
  onSaved: (s: ScopeSettings) => void;
}) {
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
        body: JSON.stringify({ timezone, locale, theme, weeklyReport, itemsPerPage: Number(itemsPerPage) }),
      });
      onSaved(res.settings);
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="max-w-3xl space-y-5 p-6">
      {saved && <Notice message="Preferences saved." />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Timezone">
          <input className={inputClass} value={timezone} onChange={(e) => setTimezone(e.target.value)} />
        </Field>
        <Field label="Language">
          <select className={inputClass} value={locale} onChange={(e) => setLocale(e.target.value)}>
            <option value="en">English</option>
            <option value="ur">Urdu</option>
            <option value="ar">Arabic</option>
            <option value="es">Spanish</option>
          </select>
        </Field>
        <Field label="Default theme">
          <select className={inputClass} value={theme} onChange={(e) => setTheme(e.target.value as never)}>
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </Field>
        <Field label="Rows per page">
          <input
            type="number"
            className={inputClass}
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" checked={weeklyReport} onChange={(e) => setWeeklyReport(e.target.checked)} />
        Email me a weekly summary report
      </label>
      <div className="flex justify-end">
        <Button onClick={save} disabled={busy}>
          {busy ? 'Saving…' : 'Save preferences'}
        </Button>
      </div>
    </Card>
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

  // Company profile (owner only)
  const [companyName, setCompanyName] = useState(user.company?.name ?? '');
  const [coBusy, setCoBusy] = useState(false);
  const [coSaved, setCoSaved] = useState(false);

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
        {
          method: 'PATCH',
          body: JSON.stringify({ name: companyName.trim() }),
        },
      );
      const updated: AdminUser = {
        ...user,
        company: res.company,
      };
      updateStoredUser(updated);
      onUserUpdated(updated);
      setCoSaved(true);
    } finally {
      setCoBusy(false);
    }
  }

  const twoCol = !isPlatform && user.company;

  return (
    <div className={`grid gap-6 ${twoCol ? 'lg:grid-cols-2' : 'max-w-2xl'}`}>
      <Card className="space-y-4 p-6">
        <h3 className="font-semibold text-slate-100">My account</h3>
        {saved && <Notice message="Account updated." />}
        {error && <ErrorBox message={error} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email">
            <input className={inputClass + ' opacity-60'} value={user.email} disabled />
          </Field>
        </div>
        <div className="border-t border-white/[0.04] pt-4">
          <p className="mb-2 text-sm font-medium text-slate-300">Change password</p>
          <div className="space-y-3">
            <input
              className={inputClass}
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <input
              className={inputClass}
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={saveAccount} disabled={busy}>
            {busy ? 'Saving…' : 'Save account'}
          </Button>
        </div>
      </Card>

      {!isPlatform && user.company && (
        <Card className="space-y-4 p-6">
          <h3 className="font-semibold text-slate-100">Company profile</h3>
          {coSaved && <Notice message="Company profile saved." />}
          <Field label="Company name">
            <input className={inputClass} value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </Field>
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-300">Status</span>
            <Badge tone={user.company.status === 'active' ? 'green' : 'red'}>{user.company.status}</Badge>
            <p className="mt-1 text-xs text-slate-400">Only the platform admin can change status.</p>
          </div>
          <div className="flex justify-end">
            <Button onClick={saveCompany} disabled={coBusy}>
              {coBusy ? 'Saving…' : 'Save company'}
            </Button>
          </div>
        </Card>
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
    <Card className="max-w-3xl space-y-4 p-6">
      {saved && <Notice message="SMTP settings saved." />}
      <p className="text-sm text-slate-400">
        Configure the mail server used to send emails (invitations, password resets, reports).
      </p>
      <Field label="SMTP host">
        <input className={inputClass} value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.gmail.com" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Port">
          <input type="number" className={inputClass} value={port} onChange={(e) => setPort(Number(e.target.value))} />
        </Field>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={secure} onChange={(e) => setSecure(e.target.checked)} />
            Use TLS/SSL
          </label>
        </div>
      </div>
      <Field label="Username">
        <input className={inputClass} value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} />
      </Field>
      <Field label={settings.smtpPasswordSet ? 'Password (leave blank to keep current)' : 'Password'}>
        <input
          type="password"
          className={inputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={settings.smtpPasswordSet ? '••••••••' : ''}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="From email">
          <input className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="From name">
          <input className={inputClass} value={fromName} onChange={(e) => setFromName(e.target.value)} />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button onClick={save} disabled={busy}>
          {busy ? 'Saving…' : 'Save SMTP settings'}
        </Button>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Reports                                                             */
/* ------------------------------------------------------------------ */

export function PlatformReports() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [c, u] = await Promise.all([
          api<{ companies: Company[] }>('/companies'),
          api<{ users: ManagedUser[] }>('/users'),
        ]);
        setCompanies(c.companies);
        setUsers(u.users);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;

  const byRole: Record<string, number> = {};
  users.forEach((u) => {
    if (u.role) byRole[u.role] = (byRole[u.role] ?? 0) + 1;
  });

  function exportCsv() {
    const rows = [['Company', 'Status', 'Users']];
    companies.forEach((c) =>
      rows.push([c.name, c.status, String(users.filter((u) => u.companyId === c.id).length)]),
    );
    downloadCsv('platform-report.csv', rows);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Platform reports</h2>
        <Button variant="secondary" onClick={exportCsv}>
          Export CSV
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Users by role</h3>
          {Object.entries(byRole).map(([role, count]) => (
            <div key={role} className="flex justify-between border-b border-white/[0.04] py-1.5 text-sm last:border-0">
              <span className="text-slate-400">{roleLabel(role as never)}</span>
              <span className="font-semibold">{count}</span>
            </div>
          ))}
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Users per company</h3>
          {companies.map((c) => (
            <div key={c.id} className="flex justify-between border-b border-white/[0.04] py-1.5 text-sm last:border-0">
              <span className="text-slate-400">{c.name}</span>
              <span className="font-semibold">{users.filter((u) => u.companyId === c.id).length}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

export function CompanyReports() {
  const [summary, setSummary] = useState<Record<string, never> | null>(null);
  const [data, setData] = useState<{ vehicles: number; drivers: number; trips: number; health: number } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api<{ summary: any }>('/dashboard');
        const s = res.summary;
        if (s) {
          setData({
            vehicles: s.vehicles.total,
            drivers: s.drivers.total,
            trips: s.trips.total,
            health: s.fleetHealth,
          });
        }
        setSummary({});
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;
  if (!data) return <EmptyState message="No data to report yet." />;

  function exportCsv() {
    if (!data) return;
    downloadCsv('company-report.csv', [
      ['Metric', 'Value'],
      ['Vehicles', String(data.vehicles)],
      ['Drivers', String(data.drivers)],
      ['Trips', String(data.trips)],
      ['Fleet health %', String(data.health)],
    ]);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Company reports</h2>
        <Button variant="secondary" onClick={exportCsv}>
          Export CSV
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total vehicles" value={data.vehicles} accent="lime" icon="🚚" />
        <StatCard label="Total drivers" value={data.drivers} accent="sky" icon="🧑‍✈️" />
        <StatCard label="Total trips" value={data.trips} accent="indigo" icon="🗺️" />
        <StatCard label="Fleet health" value={`${data.health}%`} accent="emerald" icon="💚" />
      </div>
    </div>
  );
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
