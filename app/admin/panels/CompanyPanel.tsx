"use client";

import { useEffect, useState } from 'react';
import { api, type AdminUser, type DashboardSummary, type ManagedUser } from '../lib/api';
import { Badge, Button, Card, EmptyState, Field, inputClass, StatCard } from '../components/ui';
import { AreaChart, BarList, Donut, Gauge } from '../components/charts';
import { CreateUserModal, UsersTable } from './SuperAdminPanel';

type Section = 'overview' | 'users' | 'vehicles' | 'drivers' | 'trips' | 'profile';

type Vehicle = {
  id: string;
  name: string;
  plate: string;
  model: string;
  status: string;
  location: string;
  destination: string;
  fuel: number;
  health: number;
};
type Driver = {
  id: string;
  name: string;
  status: string;
  phone: string;
  safetyScore: number;
  onTimeRate: number;
  trips: number;
};
type Trip = {
  id: string;
  ref: string;
  origin: string;
  destination: string;
  status: string;
  progress: number;
  cargo: string;
};

export function CompanyPanel({ section, user }: { section: Section; user: AdminUser }) {
  if (section === 'overview') return <Overview />;
  if (section === 'users') return <Users />;
  if (section === 'vehicles') return <Vehicles />;
  if (section === 'drivers') return <Drivers />;
  if (section === 'trips') return <Trips />;
  return <Profile user={user} />;
}

function useResource<T>(path: string, key: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const res = await api<Record<string, T[]>>(path);
      setData(res[key] ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  return { data, loading, error, reload };
}

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

function Overview() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api<{ summary: DashboardSummary | null }>('/dashboard');
        setSummary(res.summary);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;
  if (!summary) return <EmptyState message="No fleet data for this company yet." />;

  const v = summary.vehicles;
  const t = summary.trips;
  const d = summary.drivers;
  const vehicleOffline = Math.max(0, v.total - v.moving - v.idle - v.maintenance);

  const vehicleSlices = [
    { label: 'Moving', value: v.moving, color: '#1A52C4' },
    { label: 'Idle', value: v.idle, color: '#fbbf24' },
    { label: 'Maintenance', value: v.maintenance, color: '#fb7185' },
    { label: 'Offline', value: vehicleOffline, color: '#64748b' },
  ];
  const tripSlices = [
    { label: 'In transit', value: t.inTransit, color: '#3D6AE8' },
    { label: 'Scheduled', value: t.scheduled, color: '#8FA3EB' },
    { label: 'Delayed', value: t.delayed, color: '#fb7185' },
    { label: 'Completed', value: t.completed, color: '#1A52C4' },
  ];
  const driverBars = [
    { label: 'On trip', value: d.onTrip, color: '#1A52C4' },
    { label: 'Resting', value: d.resting, color: '#fbbf24' },
    { label: 'Off duty', value: d.offDuty, color: '#64748b' },
  ];

  // Illustrative weekly activity derived from current trip volume (no history table yet).
  const shape = [0.45, 0.6, 0.5, 0.8, 0.7, 0.95, 0.75];
  const base = Math.max(t.total, 6);
  const weekly = shape.map((s) => Math.round(s * base));
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Vehicles" value={v.total} hint={`${v.moving} moving`} accent="lime" icon="🚚" />
        <StatCard label="Drivers" value={d.total} hint={`${d.onTrip} on trip`} accent="sky" icon="🧑‍✈️" />
        <StatCard label="Active trips" value={t.inTransit} hint={`${t.delayed} delayed`} accent="amber" icon="🗺️" />
        <StatCard label="Total trips" value={t.total} hint={`${t.completed} completed`} accent="emerald" icon="✅" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">Fleet activity</h3>
              <p className="text-xs text-slate-500">Trips handled over the week</p>
            </div>
            <Badge tone="green">Live</Badge>
          </div>
          <AreaChart data={weekly} labels={dayLabels} color="#1A52C4" height={170} />
        </Card>
        <Card className="flex flex-col items-center justify-center p-6">
          <h3 className="mb-4 self-start font-semibold text-white">Fleet health</h3>
          <Gauge value={summary.fleetHealth} label="Avg. condition" color="#1A52C4" />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="p-6">
          <h3 className="mb-4 font-semibold text-white">Vehicle status</h3>
          <Donut data={vehicleSlices} centerValue={v.total} centerLabel="vehicles" />
        </Card>
        <Card className="p-6">
          <h3 className="mb-4 font-semibold text-white">Trip status</h3>
          <Donut data={tripSlices} centerValue={t.total} centerLabel="trips" />
        </Card>
        <Card className="p-6">
          <h3 className="mb-5 font-semibold text-white">Drivers</h3>
          <BarList data={driverBars} />
        </Card>
      </div>
    </div>
  );
}

function Users() {
  const { data, loading, error, reload } = useResource<ManagedUser>('/users', 'users');
  const [showCreate, setShowCreate] = useState(false);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Team members</h2>
        <Button onClick={() => setShowCreate(true)}>+ Add member</Button>
      </div>
      <UsersTable users={data} onChanged={reload} />
      {showCreate && (
        <CreateUserModal
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

function Vehicles() {
  const { data, loading, error } = useResource<Vehicle>('/vehicles', 'vehicles');
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Vehicles</h2>
      <Card>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/[0.06] text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3">Plate</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Fuel</th>
              <th className="px-4 py-3">Health</th>
            </tr>
          </thead>
          <tbody>
            {data.map((v) => (
              <tr key={v.id} className="border-b border-white/[0.04] last:border-0">
                <td className="px-4 py-3 font-medium text-slate-100">{v.name}<div className="text-xs text-slate-400">{v.model}</div></td>
                <td className="px-4 py-3 text-slate-400">{v.plate}</td>
                <td className="px-4 py-3"><Badge tone={statusTone(v.status)}>{v.status}</Badge></td>
                <td className="px-4 py-3 text-slate-400">{v.location}</td>
                <td className="px-4 py-3 text-slate-400">{v.fuel}%</td>
                <td className="px-4 py-3 text-slate-400">{v.health}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && <EmptyState message="No vehicles yet." />}
      </Card>
    </div>
  );
}

function Drivers() {
  const { data, loading, error } = useResource<Driver>('/drivers', 'drivers');
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Drivers</h2>
      <Card>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/[0.06] text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Safety</th>
              <th className="px-4 py-3">On-time</th>
              <th className="px-4 py-3">Trips</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.id} className="border-b border-white/[0.04] last:border-0">
                <td className="px-4 py-3 font-medium text-slate-100">{d.name}</td>
                <td className="px-4 py-3"><Badge tone={d.status === 'on-trip' ? 'green' : 'slate'}>{d.status}</Badge></td>
                <td className="px-4 py-3 text-slate-400">{d.phone}</td>
                <td className="px-4 py-3 text-slate-400">{d.safetyScore}</td>
                <td className="px-4 py-3 text-slate-400">{d.onTimeRate}%</td>
                <td className="px-4 py-3 text-slate-400">{d.trips}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && <EmptyState message="No drivers yet." />}
      </Card>
    </div>
  );
}

function Trips() {
  const { data, loading, error } = useResource<Trip>('/trips', 'trips');
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Trips</h2>
      <Card>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/[0.06] text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3">Ref</th>
              <th className="px-4 py-3">Route</th>
              <th className="px-4 py-3">Cargo</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Progress</th>
            </tr>
          </thead>
          <tbody>
            {data.map((t) => (
              <tr key={t.id} className="border-b border-white/[0.04] last:border-0">
                <td className="px-4 py-3 font-medium text-slate-100">{t.ref}</td>
                <td className="px-4 py-3 text-slate-400">{t.origin} → {t.destination}</td>
                <td className="px-4 py-3 text-slate-400">{t.cargo}</td>
                <td className="px-4 py-3"><Badge tone={tripTone(t.status)}>{t.status}</Badge></td>
                <td className="px-4 py-3 text-slate-400">{t.progress}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && <EmptyState message="No trips yet." />}
      </Card>
    </div>
  );
}

function Profile({ user }: { user: AdminUser }) {
  const [name, setName] = useState(user.company?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!user.companyId) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await api(`/companies/${user.companyId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim() }),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <h2 className="text-xl font-bold">Company profile</h2>
      <Card className="space-y-4 p-6">
        {error && <ErrorBox message={error} />}
        {saved && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            Company profile saved.
          </div>
        )}
        <Field label="Company name">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div>
          <span className="mb-1 block text-sm font-medium text-slate-300">Status</span>
          <Badge tone={user.company?.status === 'active' ? 'green' : 'red'}>
            {user.company?.status ?? 'unknown'}
          </Badge>
          <p className="mt-1 text-xs text-slate-400">Only the platform administrator can change status.</p>
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function statusTone(status: string) {
  if (status === 'moving') return 'green';
  if (status === 'maintenance') return 'amber';
  if (status === 'offline') return 'red';
  return 'slate';
}
function tripTone(status: string) {
  if (status === 'in-transit') return 'green';
  if (status === 'delayed') return 'red';
  if (status === 'completed') return 'blue';
  return 'slate';
}
