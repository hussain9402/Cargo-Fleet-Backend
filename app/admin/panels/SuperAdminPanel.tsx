"use client";

import { useEffect, useMemo, useState } from 'react';
import { ROLES } from '@/app/lib/rbac/permissions';
import { api, roleLabel, type Company, type ManagedUser } from '../lib/api';
import { Badge, Button, Card, EmptyState, Field, inputClass, Modal, Select, StatCard } from '../components/ui';
import { AreaChart, BarList, Donut } from '../components/charts';
import { DashboardSkeleton, TableSkeleton } from '../components/skeletons';

type Section = 'overview' | 'companies' | 'users' | 'audit';

type AuditLog = {
  id: string;
  company_id: string | null;
  user_id: string | null;
  action: string;
  resource: string | null;
  ip: string | null;
  detail: string | null;
  created_at: string;
};

const ASSIGNABLE_ROLES = ROLES.filter((r) => r !== 'super_admin');

export function SuperAdminPanel({ section }: { section: Section }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [c, u] = await Promise.all([
        api<{ companies: Company[] }>('/companies'),
        api<{ users: ManagedUser[] }>('/users'),
      ]);
      setCompanies(c.companies);
      setUsers(u.users);
      if (section === 'audit') {
        const a = await api<{ logs: AuditLog[] }>('/audit');
        setLogs(a.logs);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  if (loading) {
    if (section === 'overview') return <DashboardSkeleton />;
    return <TableSkeleton />;
  }
  if (error)
    return (
      <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</div>
    );

  if (section === 'overview') return <Overview companies={companies} users={users} />;
  if (section === 'companies')
    return <Companies companies={companies} users={users} reload={loadAll} />;
  if (section === 'users') return <Users companies={companies} users={users} reload={loadAll} />;
  return <Audit logs={logs} />;
}

function Overview({ companies, users }: { companies: Company[]; users: ManagedUser[] }) {
  const active = companies.filter((c) => c.status === 'active').length;
  const suspendedUsers = users.filter((u) => u.status === 'suspended').length;

  // Users by role (real data)
  const roleColors: Record<string, string> = {
    super_admin: '#1A52C4',
    company_owner: '#3D6AE8',
    fleet_manager: '#8FA3EB',
    dispatcher: '#fbbf24',
    driver_manager: '#C5D0F5',
    maintenance_manager: '#fb7185',
    finance_manager: '#c4b5fd',
    customer_support: '#22d3ee',
    driver: '#f472b6',
    customer: '#94a3b8',
  };
  const roleCounts = new Map<string, number>();
  users.forEach((u) => u.role && roleCounts.set(u.role, (roleCounts.get(u.role) ?? 0) + 1));
  const roleSlices = Array.from(roleCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([role, value]) => ({ label: roleLabel(role as never), value, color: roleColors[role] ?? '#94a3b8' }));

  // Users per company (top 6)
  const perCompany = companies
    .map((c) => ({ label: c.name, value: users.filter((u) => u.companyId === c.id).length }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const companyStatus = [
    { label: 'Active', value: active, color: '#1A52C4' },
    { label: 'Suspended', value: companies.length - active, color: '#fb7185' },
  ];

  // Signups trend from real createdAt over the last 7 days
  const days: { label: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - i);
    const next = new Date(day);
    next.setDate(day.getDate() + 1);
    const count = users.filter((u) => {
      const c = new Date(u.createdAt);
      return c >= day && c < next;
    }).length;
    days.push({ label: day.toLocaleDateString(undefined, { weekday: 'short' }), value: count });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Companies" value={companies.length} hint={`${active} active`} accent="lime" icon="🏢" />
        <StatCard label="Total users" value={users.length} accent="sky" icon="👥" />
        <StatCard label="Suspended companies" value={companies.length - active} accent="amber" icon="⏸️" />
        <StatCard label="Locked users" value={suspendedUsers} accent="rose" icon="🔒" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">New users</h3>
              <p className="text-xs text-slate-500">Sign-ups over the last 7 days</p>
            </div>
            <Badge tone="blue">{days.reduce((s, d) => s + d.value, 0)} total</Badge>
          </div>
          <AreaChart data={days.map((d) => d.value)} labels={days.map((d) => d.label)} color="#1A52C4" height={170} />
        </Card>
        <Card className="p-6">
          <h3 className="mb-4 font-semibold text-white">Company status</h3>
          <Donut data={companyStatus} centerValue={companies.length} centerLabel="companies" />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-5 font-semibold text-white">Users per company</h3>
          <BarList data={perCompany} />
        </Card>
        <Card className="p-6">
          <h3 className="mb-4 font-semibold text-white">Users by role</h3>
          <Donut data={roleSlices} centerValue={users.length} centerLabel="users" />
        </Card>
      </div>
    </div>
  );
}

function Companies({
  companies,
  users,
  reload,
}: {
  companies: Company[];
  users: ManagedUser[];
  reload: () => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api('/companies', { method: 'POST', body: JSON.stringify({ name: name.trim() }) });
      setName('');
      setShowCreate(false);
      reload();
    } finally {
      setBusy(false);
    }
  }

  async function toggle(c: Company) {
    await api(`/companies/${c.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: c.status === 'active' ? 'suspended' : 'active' }),
    });
    reload();
  }

  async function remove(c: Company) {
    if (!confirm(`Delete "${c.name}"? This removes the company record.`)) return;
    await api(`/companies/${c.id}`, { method: 'DELETE' });
    reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Companies</h2>
        <Button onClick={() => setShowCreate(true)}>+ New company</Button>
      </div>
      <Card>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/[0.06] text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Users</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id} className="border-b border-white/[0.04] last:border-0">
                <td className="px-4 py-3 font-medium text-slate-100">{c.name}</td>
                <td className="px-4 py-3 text-slate-400">
                  {users.filter((u) => u.companyId === c.id).length}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={c.status === 'active' ? 'green' : 'red'}>{c.status}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="secondary" onClick={() => toggle(c)} className="mr-2">
                    {c.status === 'active' ? 'Suspend' : 'Activate'}
                  </Button>
                  <Button variant="danger" onClick={() => remove(c)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {companies.length === 0 && <EmptyState message="No companies yet." />}
      </Card>

      {showCreate && (
        <Modal title="Create company" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            <Field label="Company name">
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button onClick={create} disabled={busy}>
                {busy ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Users({
  companies,
  users,
  reload,
}: {
  companies: Company[];
  users: ManagedUser[];
  reload: () => void;
}) {
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);

  const filtered = useMemo(
    () => (filter === 'all' ? users : users.filter((u) => u.companyId === filter)),
    [filter, users],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Users</h2>
        <div className="flex items-center gap-2">
          <Select
            className="w-auto"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All companies' },
              ...companies.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          <Button onClick={() => setShowCreate(true)}>+ New user</Button>
        </div>
      </div>

      <UsersTable users={filtered} companies={companies} showCompany onChanged={reload} />

      {showCreate && (
        <CreateUserModal
          companies={companies}
          requireCompany
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            reload();
          }}
        />
      )}
    </div>
  );
}

function Audit({ logs }: { logs: AuditLog[] }) {
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

/* Shared user table + create-user modal (also used by company panel) */

export function UsersTable({
  users,
  showCompany,
  onChanged,
}: {
  users: ManagedUser[];
  companies?: Company[];
  showCompany?: boolean;
  onChanged: () => void;
}) {
  const [managing, setManaging] = useState<ManagedUser | null>(null);

  async function quickLock(u: ManagedUser) {
    await api(`/users/${u.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: u.status === 'active' ? 'suspended' : 'active' }),
    });
    onChanged();
  }

  return (
    <Card>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-white/[0.06] text-xs uppercase text-slate-400">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Email</th>
            {showCompany && <th className="px-4 py-3">Company</th>}
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const isSuper = u.role === 'super_admin';
            return (
              <tr key={u.id} className="border-b border-white/[0.04] last:border-0">
                <td className="px-4 py-3 font-medium text-slate-100">{u.name}</td>
                <td className="px-4 py-3 text-slate-400">{u.email}</td>
                {showCompany && <td className="px-4 py-3 text-slate-400">{u.companyName ?? '—'}</td>}
                <td className="px-4 py-3">
                  <Badge tone={isSuper ? 'blue' : 'slate'}>{roleLabel(u.role)}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={u.status === 'active' ? 'green' : 'red'}>{u.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {!isSuper && (
                      <Button variant="secondary" onClick={() => quickLock(u)}>
                        {u.status === 'active' ? 'Lock' : 'Unlock'}
                      </Button>
                    )}
                    <Button variant="primary" onClick={() => setManaging(u)}>
                      Manage
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {users.length === 0 && <EmptyState message="No users found." />}

      {managing && (
        <ManageUserModal
          user={managing}
          onClose={() => setManaging(null)}
          onChanged={() => {
            setManaging(null);
            onChanged();
          }}
        />
      )}
    </Card>
  );
}

function ManageUserModal({
  user,
  onClose,
  onChanged,
}: {
  user: ManagedUser;
  onClose: () => void;
  onChanged: () => void;
}) {
  const isSuper = user.role === 'super_admin';
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<string>(user.role ?? ASSIGNABLE_ROLES[0]);
  const [status, setStatus] = useState<'active' | 'suspended'>(user.status);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setError(null);
    setBusy(true);
    try {
      const patch: Record<string, unknown> = {};
      if (name.trim() && name.trim() !== user.name) patch.name = name.trim();
      if (email.trim() && email.trim() !== user.email) patch.email = email.trim();
      if (!isSuper && role !== user.role) patch.role = role;
      if (!isSuper && status !== user.status) patch.status = status;
      if (password) patch.password = password;

      if (Object.keys(patch).length === 0) {
        onClose();
        return;
      }
      await api(`/users/${user.id}`, { method: 'PATCH', body: JSON.stringify(patch) });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete ${user.email}? This cannot be undone.`)) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/users/${user.id}`, { method: 'DELETE' });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete');
      setBusy(false);
    }
  }

  return (
    <Modal title={`Manage ${user.name}`} onClose={onClose}>
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {error}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email">
            <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </div>

        {isSuper ? (
          <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-400">
            This is a Super Admin account — role and status can&apos;t be changed here.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Role">
              <Select
                value={role}
                onChange={setRole}
                options={ASSIGNABLE_ROLES.map((r) => ({ value: r, label: roleLabel(r) }))}
              />
            </Field>
            <Field label="Status">
              <Select
                value={status}
                onChange={(v) => setStatus(v as 'active' | 'suspended')}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'suspended', label: 'Suspended (locked)' },
                ]}
              />
            </Field>
          </div>
        )}

        <Field label="Reset password (leave blank to keep current)">
          <input
            className={inputClass}
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
          />
        </Field>

        <div className="flex items-center justify-between border-t border-white/[0.06] pt-4">
          {!isSuper ? (
            <Button variant="danger" onClick={remove} disabled={busy}>
              Delete user
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function CreateUserModal({
  companies,
  requireCompany,
  fixedCompanyId,
  onClose,
  onCreated,
}: {
  companies?: Company[];
  requireCompany?: boolean;
  fixedCompanyId?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string>(ASSIGNABLE_ROLES[0]);
  const [companyId, setCompanyId] = useState(fixedCompanyId ?? companies?.[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    if (!fullName || !email || !password) {
      setError('All fields are required');
      return;
    }
    setBusy(true);
    try {
      const body: Record<string, unknown> = { fullName, email, password, role };
      if (requireCompany) body.companyId = companyId;
      await api('/users', { method: 'POST', body: JSON.stringify(body) });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create user');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Create user" onClose={onClose}>
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {error}
          </div>
        )}
        <Field label="Full name">
          <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <Field label="Email">
          <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Temporary password">
          <input className={inputClass} type="text" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {requireCompany && companies && (
          <Field label="Company">
            <Select
              value={companyId}
              onChange={setCompanyId}
              options={companies.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Select company"
            />
          </Field>
        )}
        <Field label="Role">
          <Select
            value={role}
            onChange={setRole}
            options={ASSIGNABLE_ROLES.map((r) => ({ value: r, label: roleLabel(r) }))}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? 'Creating…' : 'Create user'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
