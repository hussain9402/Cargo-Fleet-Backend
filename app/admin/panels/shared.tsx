"use client";

import { useEffect, useState } from 'react';
import {
  api,
  roleLabel,
  type Broadcast,
  type Company,
  type ContactMessage,
  type ManagedUser,
  type RoleInfo,
} from '../lib/api';
import { Badge, Button, Card, EmptyState, Field, inputClass, Modal, Select, StatCard } from '../components/ui';
import { DashboardSkeleton, PanelSkeleton, TableSkeleton } from '../components/skeletons';

function Loading({ variant = 'panel' }: { variant?: 'dashboard' | 'table' | 'panel' }) {
  if (variant === 'dashboard') return <DashboardSkeleton />;
  if (variant === 'table') return <TableSkeleton />;
  return <PanelSkeleton />;
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

const ROLE_ICONS: Record<string, string> = {
  super_admin: '👑',
  company_owner: '🏢',
  fleet_manager: '🚚',
  dispatcher: '🗺️',
  driver_manager: '🧑‍✈️',
  maintenance_manager: '🔧',
  finance_manager: '💰',
  customer_support: '🎧',
  driver: '🚛',
  customer: '📦',
};

const PERMISSION_MODULES: { module: string; perms: { id: string; label: string }[] }[] = [
  {
    module: 'Dashboard',
    perms: [{ id: 'dashboard:view', label: 'View dashboard' }],
  },
  {
    module: 'Company',
    perms: [
      { id: 'company:view', label: 'View' },
      { id: 'company:manage', label: 'Manage' },
    ],
  },
  {
    module: 'Users',
    perms: [
      { id: 'users:view', label: 'View' },
      { id: 'users:manage', label: 'Manage' },
    ],
  },
  {
    module: 'Vehicles',
    perms: [
      { id: 'vehicles:view', label: 'View' },
      { id: 'vehicles:manage', label: 'Manage' },
      { id: 'vehicles:maintenance', label: 'Maintenance' },
    ],
  },
  {
    module: 'Drivers',
    perms: [
      { id: 'drivers:view', label: 'View' },
      { id: 'drivers:manage', label: 'Manage' },
    ],
  },
  {
    module: 'Trips',
    perms: [
      { id: 'trips:view', label: 'View' },
      { id: 'trips:manage', label: 'Manage (add / edit / delete)' },
      { id: 'trips:drive', label: 'Drive' },
    ],
  },
  {
    module: 'Tracking',
    perms: [
      { id: 'tracking:view', label: 'Fleet live' },
      { id: 'tracking:own', label: 'Own only' },
    ],
  },
  {
    module: 'Fuel',
    perms: [
      { id: 'fuel:view', label: 'View' },
      { id: 'fuel:manage', label: 'Manage' },
      { id: 'fuel:submit', label: 'Submit' },
    ],
  },
  {
    module: 'Maintenance',
    perms: [
      { id: 'maintenance:view', label: 'View' },
      { id: 'maintenance:manage', label: 'Manage' },
      { id: 'maintenance:report', label: 'Report' },
    ],
  },
  {
    module: 'Reports',
    perms: [
      { id: 'reports:fleet', label: 'Fleet' },
      { id: 'reports:driver', label: 'Driver' },
      { id: 'reports:maintenance', label: 'Maintenance' },
      { id: 'reports:finance', label: 'Finance' },
    ],
  },
  {
    module: 'AI & Billing',
    perms: [
      { id: 'ai:view', label: 'AI insights' },
      { id: 'billing:view', label: 'View billing' },
      { id: 'billing:manage', label: 'Manage billing' },
    ],
  },
  {
    module: 'Support & other',
    perms: [
      { id: 'tickets:manage', label: 'Tickets' },
      { id: 'shipments:track', label: 'Shipments' },
      { id: 'notifications:view', label: 'Notifications' },
      { id: 'settings:manage', label: 'Manage settings' },
      { id: 'settings:profile', label: 'Own profile' },
    ],
  },
];

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const prettyResource = (r: string) => r.split(/[_-]/).map(cap).join(' ');

function groupPermissions(perms: string[]): { resource: string; actions: string[] }[] {
  const map = new Map<string, string[]>();
  for (const p of perms) {
    if (p === '*') continue;
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
  const [editing, setEditing] = useState<RoleInfo | null>(null);
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [perms, setPerms] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editEnabled, setEditEnabled] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ roles: RoleInfo[] }>('/roles');
      setRoles(res.roles);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openEdit(r: RoleInfo) {
    if (!r.editable) return;
    setEditing(r);
    setLabel(r.label);
    setDescription(r.description);
    setEditEnabled(r.enabled !== false);
    setPerms(new Set(r.permissions.filter((p) => p !== '*')));
    setSaveError(null);
  }

  function togglePerm(id: string) {
    setPerms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleModule(modulePerms: string[], on: boolean) {
    setPerms((prev) => {
      const next = new Set(prev);
      for (const id of modulePerms) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  async function save() {
    if (!editing) return;
    if (perms.size === 0) {
      setSaveError('Select at least one permission');
      return;
    }
    setBusy(true);
    setSaveError(null);
    try {
      await api('/roles', {
        method: 'PATCH',
        body: JSON.stringify({
          role: editing.role,
          label: label.trim(),
          description: description.trim(),
          permissions: [...perms],
          enabled: editEnabled,
        }),
      });
      setNotice(`Saved ${label.trim() || roleLabel(editing.role)}`);
      setEditing(null);
      await load();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unable to save');
    } finally {
      setBusy(false);
    }
  }

  async function resetRole() {
    if (!editing) return;
    if (editing.isCustomized) {
      if (!confirm('Reset this role to platform defaults?')) return;
      setBusy(true);
      setSaveError(null);
      try {
        await api('/roles', {
          method: 'PATCH',
          body: JSON.stringify({ role: editing.role, reset: true }),
        });
        setNotice(`Reset ${roleLabel(editing.role)} to defaults`);
        setEditing(null);
        await load();
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Unable to reset');
      } finally {
        setBusy(false);
      }
      return;
    }
    setLabel(editing.defaultLabel);
    setDescription(editing.defaultDescription);
    setPerms(new Set(editing.defaults.filter((p) => p !== '*')));
  }

  if (loading) return <Loading variant="table" />;
  if (error) return <ErrorBox message={error} />;

  const totalUsers = roles.reduce((sum, r) => sum + r.userCount, 0);
  const customized = roles.filter((r) => r.isCustomized).length;

  return (
    <div className="space-y-5">
      {notice && <Notice message={notice} />}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Roles &amp; permissions</h2>
          <p className="mt-1 text-sm text-slate-400">
            Customize each role&apos;s name, description, and permissions for this workspace. Changes apply
            immediately to API access.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-sm text-slate-300">
            <span className="font-semibold text-white">{roles.length}</span> roles
          </span>
          <span className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-sm text-slate-300">
            <span className="font-semibold text-white">{customized}</span> customized
          </span>
          <span className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-sm text-slate-300">
            <span className="font-semibold text-white">{totalUsers}</span> assigned users
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((r) => {
          const fullAccess = r.permissions.includes('*');
          const groups = fullAccess ? [] : groupPermissions(r.permissions);
          const on = r.enabled !== false;
          return (
            <Card
              key={r.role}
              className={`flex flex-col p-5 transition ${on ? '' : 'opacity-55'}`}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-xl ring-1 ring-inset ring-white/10">
                  {ROLE_ICONS[r.role] ?? '•'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-semibold text-white">{r.label}</h3>
                    {r.isCustomized && <Badge tone="blue">Custom</Badge>}
                    {!on && <Badge tone="amber">Off</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{r.description}</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {r.userCount} {r.userCount === 1 ? 'user' : 'users'} assigned
                  </p>
                </div>
                {r.editable ? (
                  <button
                    type="button"
                    onClick={() => openEdit(r)}
                    className="shrink-0 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    Edit
                  </button>
                ) : (
                  <span className="shrink-0 rounded-full bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-inset ring-white/10">
                    System
                  </span>
                )}
              </div>

              <div className="mt-4 flex-1 border-t border-white/[0.06] pt-4">
                {fullAccess ? (
                  <div className="flex items-center gap-2 rounded-lg bg-brand-600/8 px-3 py-2.5 text-sm font-medium text-brand-300 ring-1 ring-inset ring-brand-600/20">
                    <span>✦</span> Full access to every module
                  </div>
                ) : (
                  <>
                    <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {r.permissions.length} permissions · {groups.length} modules
                    </p>
                    <div className="max-h-40 space-y-1.5 overflow-y-auto">
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

      {editing && (
        <Modal title={`Edit · ${editing.label}`} onClose={() => !busy && setEditing(null)} size="lg">
          <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            {saveError && <ErrorBox message={saveError} />}

            <div
              className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 ${
                editEnabled
                  ? 'border-brand-500/30 bg-brand-600/10'
                  : 'border-white/[0.08] bg-white/[0.02]'
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-slate-100">Role active</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {editEnabled
                    ? 'This role grants its permissions to assigned users.'
                    : 'Disabled — assigned users will not get these permissions.'}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={editEnabled}
                aria-label={editEnabled ? 'Disable role' : 'Enable role'}
                onClick={() => setEditEnabled((v) => !v)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                  editEnabled ? 'bg-brand-600' : 'bg-white/15'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                    editEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <Field label="Display name">
              <input
                className={inputClass}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={roleLabel(editing.role)}
              />
            </Field>
            <Field label="Description">
              <textarea
                className={inputClass}
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-300">Permissions</p>
                <p className="text-xs text-slate-500">{perms.size} selected</p>
              </div>
              <div className="space-y-3">
                {PERMISSION_MODULES.map((mod) => {
                  const ids = mod.perms.map((p) => p.id);
                  const allOn = ids.every((id) => perms.has(id));
                  const someOn = ids.some((id) => perms.has(id));
                  return (
                    <div
                      key={mod.module}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-100">{mod.module}</p>
                        <button
                          type="button"
                          className="text-xs font-medium text-brand-400 hover:underline"
                          onClick={() => toggleModule(ids, !allOn)}
                        >
                          {allOn ? 'Clear' : someOn ? 'Select all' : 'Select all'}
                        </button>
                      </div>
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {mod.perms.map((p) => {
                          const on = perms.has(p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              role="switch"
                              aria-checked={on}
                              onClick={() => togglePerm(p.id)}
                              className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                                on
                                  ? 'border-brand-500/40 bg-brand-600/10 text-slate-100'
                                  : 'border-white/[0.06] bg-transparent text-slate-400 hover:bg-white/[0.03]'
                              }`}
                            >
                              <span className="min-w-0 truncate font-medium">{p.label}</span>
                              <span
                                className={`relative h-5 w-9 shrink-0 rounded-full transition ${
                                  on ? 'bg-brand-600' : 'bg-white/15'
                                }`}
                              >
                                <span
                                  className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition ${
                                    on ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-4">
              <Button variant="ghost" onClick={resetRole} disabled={busy}>
                {editing.isCustomized ? 'Reset to defaults' : 'Restore defaults'}
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setEditing(null)} disabled={busy}>
                  Cancel
                </Button>
                <Button onClick={save} disabled={busy}>
                  {busy ? 'Saving…' : 'Save role'}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
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
    setError(null);
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
    setError(null);
    try {
      await api('/broadcasts', {
        method: 'POST',
        body: JSON.stringify({ title, body: bodyText, audience }),
      });
      setTitle('');
      setBodyText('');
      setShow(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send broadcast');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this broadcast?')) return;
    await api(`/broadcasts/${id}`, { method: 'DELETE' });
    load();
  }

  if (loading) return <Loading variant="table" />;

  return (
    <div className="space-y-4">
      {error && <ErrorBox message={error} />}
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
                <Select
                  value={audience}
                  onChange={setAudience}
                  options={[
                    { value: 'all', label: 'All members' },
                    { value: 'fleet_manager', label: 'Fleet Managers' },
                    { value: 'dispatcher', label: 'Dispatchers' },
                    { value: 'driver', label: 'Drivers' },
                  ]}
                />
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

  if (loading) return <Loading variant="table" />;
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

  if (loading) return <Loading variant="table" />;
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

  if (loading) return <Loading variant="dashboard" />;
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

  if (loading) return <Loading variant="dashboard" />;
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
