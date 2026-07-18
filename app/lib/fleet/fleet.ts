import { generateId, query, queryOne } from '../db';

/* ------------------------------------------------------------------ */
/* Types (mirror mobile_app/src/data/types.ts)                         */
/* ------------------------------------------------------------------ */

export type VehicleStatus = 'moving' | 'idle' | 'maintenance' | 'offline';

export type Vehicle = {
  id: string;
  name: string;
  plate: string;
  model: string;
  status: VehicleStatus;
  driverId: string | null;
  speed: number;
  location: string;
  destination: string;
  etaMinutes: number;
  fuel: number;
  odometer: number;
  health: number;
  nextService: string;
};

export type Driver = {
  id: string;
  name: string;
  initials: string;
  vehicleId: string | null;
  status: 'on-trip' | 'resting' | 'off-duty';
  safetyScore: number;
  phone: string;
  hoursThisWeek: number;
  hoursRemaining: number;
  trips: number;
  onTimeRate: number;
  joined: string;
};

export type Trip = {
  id: string;
  ref: string;
  vehicleId: string | null;
  driverId: string | null;
  origin: string;
  destination: string;
  status: 'in-transit' | 'scheduled' | 'completed' | 'delayed';
  progress: number;
  departAt: string;
  arriveAt: string;
  distance: number;
  cargo: string;
};

/* ------------------------------------------------------------------ */
/* Schema                                                              */
/* ------------------------------------------------------------------ */

let fleetTablesReady = false;

export async function ensureFleetTables(force = false) {
  if (fleetTablesReady && !force) return;

  await query(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id CHAR(36) PRIMARY KEY,
      company_id CHAR(36) NOT NULL,
      name VARCHAR(120) NOT NULL,
      plate VARCHAR(40) NOT NULL,
      model VARCHAR(120) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'idle',
      driver_id CHAR(36) NULL,
      speed INT NOT NULL DEFAULT 0,
      location VARCHAR(160) NOT NULL DEFAULT '',
      destination VARCHAR(160) NOT NULL DEFAULT '',
      eta_minutes INT NOT NULL DEFAULT 0,
      fuel INT NOT NULL DEFAULT 100,
      odometer INT NOT NULL DEFAULT 0,
      health INT NOT NULL DEFAULT 100,
      next_service VARCHAR(80) NOT NULL DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_vehicles_company (company_id)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS drivers (
      id CHAR(36) PRIMARY KEY,
      company_id CHAR(36) NOT NULL,
      name VARCHAR(160) NOT NULL,
      initials VARCHAR(8) NOT NULL DEFAULT '',
      vehicle_id CHAR(36) NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'off-duty',
      safety_score INT NOT NULL DEFAULT 100,
      phone VARCHAR(40) NOT NULL DEFAULT '',
      hours_this_week INT NOT NULL DEFAULT 0,
      hours_remaining INT NOT NULL DEFAULT 60,
      trips INT NOT NULL DEFAULT 0,
      on_time_rate INT NOT NULL DEFAULT 100,
      joined VARCHAR(40) NOT NULL DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_drivers_company (company_id)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS trips (
      id CHAR(36) PRIMARY KEY,
      company_id CHAR(36) NOT NULL,
      ref VARCHAR(40) NOT NULL,
      vehicle_id CHAR(36) NULL,
      driver_id CHAR(36) NULL,
      origin VARCHAR(160) NOT NULL DEFAULT '',
      destination VARCHAR(160) NOT NULL DEFAULT '',
      status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
      progress INT NOT NULL DEFAULT 0,
      depart_at VARCHAR(40) NOT NULL DEFAULT '',
      arrive_at VARCHAR(40) NOT NULL DEFAULT '',
      distance INT NOT NULL DEFAULT 0,
      cargo VARCHAR(160) NOT NULL DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_trips_company (company_id)
    )
  `);

  fleetTablesReady = true;
}

/* ------------------------------------------------------------------ */
/* Row mappers                                                         */
/* ------------------------------------------------------------------ */

/* eslint-disable @typescript-eslint/no-explicit-any */
function toVehicle(row: any): Vehicle {
  return {
    id: row.id,
    name: row.name,
    plate: row.plate,
    model: row.model,
    status: row.status,
    driverId: row.driver_id,
    speed: row.speed,
    location: row.location,
    destination: row.destination,
    etaMinutes: row.eta_minutes,
    fuel: row.fuel,
    odometer: row.odometer,
    health: row.health,
    nextService: row.next_service,
  };
}

function toDriver(row: any): Driver {
  return {
    id: row.id,
    name: row.name,
    initials: row.initials,
    vehicleId: row.vehicle_id,
    status: row.status,
    safetyScore: row.safety_score,
    phone: row.phone,
    hoursThisWeek: row.hours_this_week,
    hoursRemaining: row.hours_remaining,
    trips: row.trips,
    onTimeRate: row.on_time_rate,
    joined: row.joined,
  };
}

function toTrip(row: any): Trip {
  return {
    id: row.id,
    ref: row.ref,
    vehicleId: row.vehicle_id,
    driverId: row.driver_id,
    origin: row.origin,
    destination: row.destination,
    status: row.status,
    progress: row.progress,
    departAt: row.depart_at,
    arriveAt: row.arrive_at,
    distance: row.distance,
    cargo: row.cargo,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/* ------------------------------------------------------------------ */
/* Queries (always tenant-scoped)                                      */
/* ------------------------------------------------------------------ */

export async function listVehicles(companyId: string): Promise<Vehicle[]> {
  const rows = await query<any[]>(
    `SELECT * FROM vehicles WHERE company_id = ? ORDER BY name ASC`,
    [companyId],
  );
  return rows.map(toVehicle);
}

export async function listDrivers(companyId: string): Promise<Driver[]> {
  const rows = await query<any[]>(
    `SELECT * FROM drivers WHERE company_id = ? ORDER BY name ASC`,
    [companyId],
  );
  return rows.map(toDriver);
}

export async function listTrips(companyId: string): Promise<Trip[]> {
  const rows = await query<any[]>(
    `SELECT * FROM trips WHERE company_id = ? ORDER BY created_at DESC`,
    [companyId],
  );
  return rows.map(toTrip);
}

export async function getVehicle(companyId: string, id: string): Promise<Vehicle | null> {
  const row = await queryOne<any>(`SELECT * FROM vehicles WHERE company_id = ? AND id = ? LIMIT 1`, [
    companyId,
    id,
  ]);
  return row ? toVehicle(row) : null;
}

export async function createVehicle(
  companyId: string,
  input: Partial<Vehicle> & { name: string; plate: string; model: string },
): Promise<Vehicle> {
  const id = generateId();
  await query(
    `INSERT INTO vehicles (id, company_id, name, plate, model, status, speed, location, destination, eta_minutes, fuel, odometer, health, next_service)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      companyId,
      input.name,
      input.plate,
      input.model,
      input.status ?? 'idle',
      input.speed ?? 0,
      input.location ?? '',
      input.destination ?? '',
      input.etaMinutes ?? 0,
      input.fuel ?? 100,
      input.odometer ?? 0,
      input.health ?? 100,
      input.nextService ?? '',
    ],
  );
  const created = await getVehicle(companyId, id);
  if (!created) throw new Error('VEHICLE_CREATE_FAILED');
  return created;
}

export async function updateVehicleStatus(
  companyId: string,
  id: string,
  status: VehicleStatus,
): Promise<Vehicle | null> {
  await query(`UPDATE vehicles SET status = ? WHERE company_id = ? AND id = ?`, [
    status,
    companyId,
    id,
  ]);
  return getVehicle(companyId, id);
}

export async function createTrip(
  companyId: string,
  input: Partial<Trip> & { origin: string; destination: string },
): Promise<Trip> {
  const id = generateId();
  const ref = input.ref ?? `TRP-${Math.floor(1000 + Math.random() * 9000)}`;
  await query(
    `INSERT INTO trips (id, company_id, ref, vehicle_id, driver_id, origin, destination, status, progress, depart_at, arrive_at, distance, cargo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      companyId,
      ref,
      input.vehicleId ?? null,
      input.driverId ?? null,
      input.origin,
      input.destination,
      input.status ?? 'scheduled',
      input.progress ?? 0,
      input.departAt ?? '',
      input.arriveAt ?? '',
      input.distance ?? 0,
      input.cargo ?? '',
    ],
  );
  const rows = await query<any[]>(`SELECT * FROM trips WHERE company_id = ? AND id = ? LIMIT 1`, [
    companyId,
    id,
  ]);
  return toTrip(rows[0]);
}

export async function updateTripStatus(
  companyId: string,
  id: string,
  status: Trip['status'],
  progress?: number,
): Promise<Trip | null> {
  const nextProgress = progress ?? (status === 'completed' ? 100 : undefined);
  if (nextProgress === undefined) {
    await query(`UPDATE trips SET status = ? WHERE company_id = ? AND id = ?`, [status, companyId, id]);
  } else {
    await query(`UPDATE trips SET status = ?, progress = ? WHERE company_id = ? AND id = ?`, [
      status,
      nextProgress,
      companyId,
      id,
    ]);
  }
  const rows = await query<any[]>(`SELECT * FROM trips WHERE company_id = ? AND id = ? LIMIT 1`, [
    companyId,
    id,
  ]);
  return rows[0] ? toTrip(rows[0]) : null;
}

/* ------------------------------------------------------------------ */
/* Dashboard summary                                                   */
/* ------------------------------------------------------------------ */

export type DashboardSummary = {
  vehicles: { total: number; moving: number; idle: number; maintenance: number };
  drivers: { total: number; onTrip: number; resting: number; offDuty: number };
  trips: { total: number; inTransit: number; scheduled: number; delayed: number; completed: number };
  fleetHealth: number;
};

export async function getDashboardSummary(companyId: string): Promise<DashboardSummary> {
  const [vehicles, drivers, trips] = await Promise.all([
    listVehicles(companyId),
    listDrivers(companyId),
    listTrips(companyId),
  ]);

  const avgHealth = vehicles.length
    ? Math.round(vehicles.reduce((sum, v) => sum + v.health, 0) / vehicles.length)
    : 100;

  return {
    vehicles: {
      total: vehicles.length,
      moving: vehicles.filter((v) => v.status === 'moving').length,
      idle: vehicles.filter((v) => v.status === 'idle').length,
      maintenance: vehicles.filter((v) => v.status === 'maintenance').length,
    },
    drivers: {
      total: drivers.length,
      onTrip: drivers.filter((d) => d.status === 'on-trip').length,
      resting: drivers.filter((d) => d.status === 'resting').length,
      offDuty: drivers.filter((d) => d.status === 'off-duty').length,
    },
    trips: {
      total: trips.length,
      inTransit: trips.filter((t) => t.status === 'in-transit').length,
      scheduled: trips.filter((t) => t.status === 'scheduled').length,
      delayed: trips.filter((t) => t.status === 'delayed').length,
      completed: trips.filter((t) => t.status === 'completed').length,
    },
    fleetHealth: avgHealth,
  };
}

/* ------------------------------------------------------------------ */
/* Per-company seeding                                                 */
/* ------------------------------------------------------------------ */

export async function seedCompanyFleet(companyId: string) {
  const existing = await queryOne<{ count: number }>(
    `SELECT COUNT(*) AS count FROM vehicles WHERE company_id = ?`,
    [companyId],
  );
  if ((existing?.count ?? 0) > 0) return;

  const driverSeeds = [
    { name: 'Marcus Reed', initials: 'MR', status: 'on-trip', safety: 94, phone: '+1 (415) 555-0148', hw: 38, hr: 22, trips: 312, otr: 97, joined: 'Mar 2021' },
    { name: 'Elena Sokolova', initials: 'ES', status: 'on-trip', safety: 88, phone: '+1 (415) 555-0192', hw: 41, hr: 19, trips: 188, otr: 92, joined: 'Jul 2022' },
    { name: 'David Okafor', initials: 'DO', status: 'resting', safety: 76, phone: '+1 (415) 555-0177', hw: 44, hr: 16, trips: 401, otr: 89, joined: 'Jan 2020' },
    { name: 'Priya Nair', initials: 'PN', status: 'off-duty', safety: 91, phone: '+1 (415) 555-0123', hw: 12, hr: 48, trips: 142, otr: 95, joined: 'Sep 2023' },
    { name: 'Tom Becker', initials: 'TB', status: 'on-trip', safety: 83, phone: '+1 (415) 555-0165', hw: 36, hr: 24, trips: 256, otr: 90, joined: 'Nov 2021' },
  ];

  const driverIds: string[] = [];
  for (const d of driverSeeds) {
    const id = generateId();
    driverIds.push(id);
    await query(
      `INSERT INTO drivers (id, company_id, name, initials, status, safety_score, phone, hours_this_week, hours_remaining, trips, on_time_rate, joined)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, companyId, d.name, d.initials, d.status, d.safety, d.phone, d.hw, d.hr, d.trips, d.otr, d.joined],
    );
  }

  const vehicleSeeds = [
    { name: 'Truck 04', plate: 'FL-4821', model: 'Freightliner Cascadia', status: 'moving', speed: 62, loc: 'I-80 W, Sacramento', dest: 'Oakland DC', eta: 48, fuel: 72, odo: 184290, health: 96, svc: 'in 1,200 mi' },
    { name: 'Truck 11', plate: 'FL-1190', model: 'Volvo VNL 860', status: 'moving', speed: 55, loc: 'US-101 S, San Jose', dest: 'Fresno Hub', eta: 95, fuel: 41, odo: 97640, health: 88, svc: 'in 600 mi' },
    { name: 'Truck 07', plate: 'FL-3375', model: 'Kenworth T680', status: 'idle', speed: 0, loc: 'Stockton Yard', dest: '—', eta: 0, fuel: 88, odo: 221450, health: 64, svc: 'overdue' },
    { name: 'Truck 02', plate: 'FL-2204', model: 'Peterbilt 579', status: 'maintenance', speed: 0, loc: 'Depot — Bay 3', dest: '—', eta: 0, fuel: 30, odo: 312880, health: 42, svc: 'in service' },
    { name: 'Truck 19', plate: 'FL-1962', model: 'Mack Anthem', status: 'moving', speed: 47, loc: 'CA-99 N, Modesto', dest: 'Sacramento DC', eta: 71, fuel: 59, odo: 56120, health: 91, svc: 'in 2,400 mi' },
  ];

  const vehicleIds: string[] = [];
  for (let i = 0; i < vehicleSeeds.length; i++) {
    const v = vehicleSeeds[i];
    const id = generateId();
    vehicleIds.push(id);
    await query(
      `INSERT INTO vehicles (id, company_id, name, plate, model, status, driver_id, speed, location, destination, eta_minutes, fuel, odometer, health, next_service)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, companyId, v.name, v.plate, v.model, v.status, driverIds[i] ?? null, v.speed, v.loc, v.dest, v.eta, v.fuel, v.odo, v.health, v.svc],
    );
    if (driverIds[i]) {
      await query(`UPDATE drivers SET vehicle_id = ? WHERE id = ?`, [id, driverIds[i]]);
    }
  }

  const tripSeeds = [
    { ref: 'TRP-9043', vi: 0, di: 0, o: 'Reno DC', d: 'Oakland DC', s: 'in-transit', p: 64, dep: '06:10', arr: '10:35', dist: 218, cargo: 'Palletized retail' },
    { ref: 'TRP-9041', vi: 1, di: 1, o: 'San Jose', d: 'Fresno Hub', s: 'delayed', p: 38, dep: '07:25', arr: '11:50', dist: 152, cargo: 'Refrigerated goods' },
    { ref: 'TRP-9038', vi: 4, di: 4, o: 'Bakersfield', d: 'Sacramento DC', s: 'in-transit', p: 81, dep: '05:00', arr: '10:10', dist: 284, cargo: 'Dry bulk' },
    { ref: 'TRP-9051', vi: 2, di: 2, o: 'Stockton Yard', d: 'Los Angeles DC', s: 'scheduled', p: 0, dep: '13:30', arr: '20:15', dist: 372, cargo: 'Mixed freight' },
    { ref: 'TRP-9022', vi: 3, di: 3, o: 'Oakland DC', d: 'Reno DC', s: 'completed', p: 100, dep: 'Yesterday', arr: '21:40', dist: 218, cargo: 'Palletized retail' },
  ];

  for (const t of tripSeeds) {
    await query(
      `INSERT INTO trips (id, company_id, ref, vehicle_id, driver_id, origin, destination, status, progress, depart_at, arrive_at, distance, cargo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [generateId(), companyId, t.ref, vehicleIds[t.vi] ?? null, driverIds[t.di] ?? null, t.o, t.d, t.s, t.p, t.dep, t.arr, t.dist, t.cargo],
    );
  }
}
