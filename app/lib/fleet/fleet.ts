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
  /** Live GPS from the driver’s app (null when never reported). */
  lat: number | null;
  lng: number | null;
  heading: number | null;
  locationUpdatedAt: string | null;
};

export type Driver = {
  id: string;
  name: string;
  initials: string;
  vehicleId: string | null;
  userId: string | null;
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
  customerUserId: string | null;
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
      customer_user_id CHAR(36) NULL,
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

  // Own-data links (auto-migrate older installs).
  await ensureColumn('drivers', 'user_id', 'CHAR(36) NULL');
  await ensureColumn('trips', 'customer_user_id', 'CHAR(36) NULL');
  // Live GPS from driver mobile app.
  await ensureColumn('vehicles', 'lat', 'DOUBLE NULL');
  await ensureColumn('vehicles', 'lng', 'DOUBLE NULL');
  await ensureColumn('vehicles', 'heading', 'DOUBLE NULL');
  await ensureColumn('vehicles', 'location_updated_at', 'TIMESTAMP NULL');

  fleetTablesReady = true;
}

async function ensureColumn(table: string, column: string, definition: string) {
  // MySQL prepared statements don't support placeholders in SHOW COLUMNS LIKE.
  if (!/^[a-zA-Z0-9_]+$/.test(table) || !/^[a-zA-Z0-9_]+$/.test(column)) {
    throw new Error('Invalid table/column identifier');
  }
  const rows = await query<Record<string, unknown>[]>(
    `SHOW COLUMNS FROM \`${table}\` LIKE '${column}'`,
  );
  if (!rows.length) {
    await query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
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
    lat: row.lat != null ? Number(row.lat) : null,
    lng: row.lng != null ? Number(row.lng) : null,
    heading: row.heading != null ? Number(row.heading) : null,
    locationUpdatedAt: row.location_updated_at
      ? new Date(row.location_updated_at).toISOString()
      : null,
  };
}

function toDriver(row: any): Driver {
  return {
    id: row.id,
    name: row.name,
    initials: row.initials,
    vehicleId: row.vehicle_id,
    userId: row.user_id ?? null,
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
    customerUserId: row.customer_user_id ?? null,
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

/** Driver profile linked to a login user (for own-data scoping). */
export async function findDriverByUserId(
  companyId: string,
  userId: string,
): Promise<Driver | null> {
  const row = await queryOne<any>(
    `SELECT * FROM drivers WHERE company_id = ? AND user_id = ? LIMIT 1`,
    [companyId, userId],
  );
  return row ? toDriver(row) : null;
}

/** Active trip the driver is currently running (in transit or delayed). */
export async function findActiveTripForDriver(
  companyId: string,
  driverId: string,
): Promise<Trip | null> {
  const row = await queryOne<any>(
    `SELECT * FROM trips
     WHERE company_id = ? AND driver_id = ? AND status IN ('in-transit', 'delayed')
     ORDER BY created_at DESC
     LIMIT 1`,
    [companyId, driverId],
  );
  return row ? toTrip(row) : null;
}

/**
 * Persist live GPS from the driver’s phone onto the assigned vehicle.
 */
export async function updateVehicleLiveLocation(
  companyId: string,
  vehicleId: string,
  input: { lat: number; lng: number; heading?: number | null; speed?: number | null },
): Promise<Vehicle | null> {
  const speed =
    input.speed != null && Number.isFinite(input.speed)
      ? Math.max(0, Math.round(input.speed))
      : undefined;
  const heading =
    input.heading != null && Number.isFinite(input.heading) ? input.heading : null;

  if (speed !== undefined) {
    await query(
      `UPDATE vehicles
       SET lat = ?, lng = ?, heading = ?, speed = ?,
           location = 'Live tracking',
           status = CASE WHEN status = 'maintenance' THEN status ELSE 'moving' END,
           location_updated_at = CURRENT_TIMESTAMP
       WHERE company_id = ? AND id = ?`,
      [input.lat, input.lng, heading, speed, companyId, vehicleId],
    );
  } else {
    await query(
      `UPDATE vehicles
       SET lat = ?, lng = ?, heading = ?,
           location = 'Live tracking',
           status = CASE WHEN status = 'maintenance' THEN status ELSE 'moving' END,
           location_updated_at = CURRENT_TIMESTAMP
       WHERE company_id = ? AND id = ?`,
      [input.lat, input.lng, heading, companyId, vehicleId],
    );
  }

  return getVehicle(companyId, vehicleId);
}

export async function getTrip(companyId: string, id: string): Promise<Trip | null> {
  const row = await queryOne<any>(
    `SELECT * FROM trips WHERE company_id = ? AND id = ? LIMIT 1`,
    [companyId, id],
  );
  return row ? toTrip(row) : null;
}

/**
 * Own-data scopes used by API routes.
 * - company: full tenant lists (managers / owners / support with view perms)
 * - driver: only rows tied to this user's driver profile
 * - customer: only trips where customer_user_id = this user
 */
export type DataScope = 'company' | 'driver' | 'customer';

export async function listVehiclesScoped(
  companyId: string,
  scope: DataScope,
  userId: string,
): Promise<Vehicle[]> {
  if (scope === 'company') return listVehicles(companyId);
  if (scope === 'customer') {
    // Customer's shipments' vehicles only
    const trips = await listTripsScoped(companyId, 'customer', userId);
    const ids = [...new Set(trips.map((t) => t.vehicleId).filter(Boolean))] as string[];
    if (!ids.length) return [];
    const all = await listVehicles(companyId);
    return all.filter((v) => ids.includes(v.id));
  }
  const driver = await findDriverByUserId(companyId, userId);
  if (!driver?.vehicleId) return [];
  const vehicle = await getVehicle(companyId, driver.vehicleId);
  return vehicle ? [vehicle] : [];
}

export async function listDriversScoped(
  companyId: string,
  scope: DataScope,
  userId: string,
): Promise<Driver[]> {
  if (scope === 'company') return listDrivers(companyId);
  if (scope === 'customer') return [];
  const driver = await findDriverByUserId(companyId, userId);
  return driver ? [driver] : [];
}

export async function listTripsScoped(
  companyId: string,
  scope: DataScope,
  userId: string,
): Promise<Trip[]> {
  if (scope === 'company') return listTrips(companyId);
  if (scope === 'customer') {
    const rows = await query<any[]>(
      `SELECT * FROM trips WHERE company_id = ? AND customer_user_id = ? ORDER BY created_at DESC`,
      [companyId, userId],
    );
    return rows.map(toTrip);
  }
  const driver = await findDriverByUserId(companyId, userId);
  if (!driver) return [];
  const rows = await query<any[]>(
    `SELECT * FROM trips WHERE company_id = ? AND driver_id = ? ORDER BY created_at DESC`,
    [companyId, driver.id],
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
    `INSERT INTO trips (id, company_id, ref, vehicle_id, driver_id, customer_user_id, origin, destination, status, progress, depart_at, arrive_at, distance, cargo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      companyId,
      ref,
      input.vehicleId ?? null,
      input.driverId ?? null,
      input.customerUserId ?? null,
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

export async function updateTrip(
  companyId: string,
  id: string,
  input: Partial<{
    origin: string;
    destination: string;
    vehicleId: string | null;
    driverId: string | null;
    customerUserId: string | null;
    cargo: string;
    distance: number;
    departAt: string;
    arriveAt: string;
    status: Trip['status'];
    progress: number;
  }>,
): Promise<Trip | null> {
  const existing = await getTrip(companyId, id);
  if (!existing) return null;

  const next = {
    origin: input.origin ?? existing.origin,
    destination: input.destination ?? existing.destination,
    vehicleId: input.vehicleId !== undefined ? input.vehicleId : existing.vehicleId,
    driverId: input.driverId !== undefined ? input.driverId : existing.driverId,
    customerUserId:
      input.customerUserId !== undefined ? input.customerUserId : existing.customerUserId,
    cargo: input.cargo ?? existing.cargo,
    distance: input.distance ?? existing.distance,
    departAt: input.departAt ?? existing.departAt,
    arriveAt: input.arriveAt ?? existing.arriveAt,
    status: input.status ?? existing.status,
    progress: input.progress ?? existing.progress,
  };

  await query(
    `UPDATE trips SET
      vehicle_id = ?, driver_id = ?, customer_user_id = ?,
      origin = ?, destination = ?, status = ?, progress = ?,
      depart_at = ?, arrive_at = ?, distance = ?, cargo = ?
     WHERE company_id = ? AND id = ?`,
    [
      next.vehicleId,
      next.driverId,
      next.customerUserId,
      next.origin,
      next.destination,
      next.status,
      next.progress,
      next.departAt,
      next.arriveAt,
      next.distance,
      next.cargo,
      companyId,
      id,
    ],
  );

  return getTrip(companyId, id);
}

export async function deleteTrip(companyId: string, id: string): Promise<boolean> {
  const existing = await getTrip(companyId, id);
  if (!existing) return false;
  await query(`DELETE FROM trips WHERE company_id = ? AND id = ?`, [companyId, id]);
  return true;
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

export async function getDashboardSummary(
  companyId: string,
  scope: DataScope = 'company',
  userId?: string,
): Promise<DashboardSummary> {
  const uid = userId ?? '';
  const [vehicles, drivers, trips] = await Promise.all([
    listVehiclesScoped(companyId, scope, uid),
    listDriversScoped(companyId, scope, uid),
    listTripsScoped(companyId, scope, uid),
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

/**
 * Link demo login accounts to fleet rows so own-data filters work.
 * Safe to call repeatedly (idempotent).
 */
export async function linkDemoOwnData(companyId: string) {
  await ensureFleetTables();

  const driverUser = await queryOne<{ id: string }>(
    `SELECT id FROM users WHERE email = 'driver@cargo.io' AND company_id = ? LIMIT 1`,
    [companyId],
  );
  if (driverUser) {
    const linked = await queryOne<{ id: string }>(
      `SELECT id FROM drivers WHERE company_id = ? AND user_id = ? LIMIT 1`,
      [companyId, driverUser.id],
    );
    if (!linked) {
      // Prefer Marcus Reed; otherwise first unlinked driver.
      const marcus = await queryOne<{ id: string }>(
        `SELECT id FROM drivers WHERE company_id = ? AND name = 'Marcus Reed' LIMIT 1`,
        [companyId],
      );
      const target =
        marcus ??
        (await queryOne<{ id: string }>(
          `SELECT id FROM drivers WHERE company_id = ? AND (user_id IS NULL OR user_id = '') ORDER BY name ASC LIMIT 1`,
          [companyId],
        ));
      if (target) {
        await query(`UPDATE drivers SET user_id = ? WHERE id = ? AND company_id = ?`, [
          driverUser.id,
          target.id,
          companyId,
        ]);
      }
    }
  }

  const customerUser = await queryOne<{ id: string }>(
    `SELECT id FROM users WHERE email = 'customer@cargo.io' AND company_id = ? LIMIT 1`,
    [companyId],
  );
  if (customerUser) {
    const owned = await queryOne<{ count: number }>(
      `SELECT COUNT(*) AS count FROM trips WHERE company_id = ? AND customer_user_id = ?`,
      [companyId, customerUser.id],
    );
    if ((owned?.count ?? 0) === 0) {
      const trips = await query<{ id: string }[]>(
        `SELECT id FROM trips WHERE company_id = ? AND (customer_user_id IS NULL OR customer_user_id = '')
         ORDER BY created_at DESC LIMIT 2`,
        [companyId],
      );
      for (const t of trips) {
        await query(`UPDATE trips SET customer_user_id = ? WHERE id = ? AND company_id = ?`, [
          customerUser.id,
          t.id,
          companyId,
        ]);
      }
    }
  }
}

/** Resolve list scope from the caller's roles. */
export function resolveDataScope(roles: string[]): DataScope {
  const set = new Set(roles);
  // Platform / managers / anyone with company-wide view perms
  if (
    set.has('super_admin') ||
    set.has('company_owner') ||
    set.has('fleet_manager') ||
    set.has('dispatcher') ||
    set.has('driver_manager') ||
    set.has('maintenance_manager') ||
    set.has('finance_manager') ||
    set.has('customer_support')
  ) {
    return 'company';
  }
  if (set.has('driver')) return 'driver';
  if (set.has('customer')) return 'customer';
  // Fallback: if they only hold tracking:own / trips:drive style access
  return 'driver';
}
