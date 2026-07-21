import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse, optionsResponse, parseJsonBody } from '@/app/lib/auth/response';
import { requirePermission } from '@/app/lib/rbac/guard';
import { isPlatformRole, type Permission } from '@/app/lib/rbac/permissions';
import { PLATFORM_ROLE_SCOPE, rolesCan } from '@/app/lib/rbac/roleOverrides';
import {
  ensureFleetTables,
  findActiveTripForDriver,
  findDriverByUserId,
  getTrip,
  getVehicle,
  listVehiclesScoped,
  resolveDataScope,
  updateVehicleLiveLocation,
} from '@/app/lib/fleet/fleet';

export async function OPTIONS() {
  return optionsResponse();
}

async function hasAnyPerm(
  companyId: string | null,
  roles: Parameters<typeof rolesCan>[1],
  perms: Permission[],
) {
  const platform = roles.some((r) => isPlatformRole(r));
  const scope = platform ? PLATFORM_ROLE_SCOPE : companyId;
  for (const p of perms) {
    if (await rolesCan(scope, roles, p)) return true;
  }
  return false;
}

/**
 * GET /api/v1/tracking
 * Live positions for vehicles in the caller’s scope (managers / drivers / customers).
 */
export async function GET(request: NextRequest) {
  const guard = await requirePermission(request);
  if (!guard.ok) return guard.response;

  const { companyId, userId, roles } = guard.context;
  if (
    !(await hasAnyPerm(companyId, roles, [
      'tracking:view',
      'tracking:own',
      'trips:drive',
      'trips:view',
      'vehicles:view',
      'shipments:track',
    ]))
  ) {
    return errorResponse('Forbidden', 403);
  }
  if (!companyId) return jsonResponse({ locations: [] });

  try {
    await ensureFleetTables();
    const scope = resolveDataScope(roles);
    const vehicles = await listVehiclesScoped(companyId, scope, userId);
    const locations = vehicles
      .filter((v) => v.lat != null && v.lng != null)
      .map((v) => ({
        vehicleId: v.id,
        lat: v.lat as number,
        lng: v.lng as number,
        heading: v.heading,
        speed: v.speed,
        updatedAt: v.locationUpdatedAt,
        name: v.name,
        status: v.status,
      }));
    return jsonResponse({ locations, scope });
  } catch (error) {
    console.error('List tracking error:', error);
    return errorResponse('Unable to load live locations', 500);
  }
}

/**
 * POST /api/v1/tracking
 * Driver app reports current GPS while on an active trip.
 * Body: { lat, lng, heading?, speed?, tripId? }
 */
export async function POST(request: NextRequest) {
  const guard = await requirePermission(request);
  if (!guard.ok) return guard.response;

  const { companyId, userId, roles } = guard.context;
  if (!(await hasAnyPerm(companyId, roles, ['trips:drive']))) {
    return errorResponse('Forbidden — drivers only', 403);
  }
  if (!companyId) return errorResponse('No company context', 400);

  const body = await parseJsonBody<{
    lat?: number;
    lng?: number;
    heading?: number;
    speed?: number;
    tripId?: string;
  }>(request);

  if (
    body?.lat == null ||
    body?.lng == null ||
    !Number.isFinite(body.lat) ||
    !Number.isFinite(body.lng) ||
    Math.abs(body.lat) > 90 ||
    Math.abs(body.lng) > 180
  ) {
    return errorResponse('Valid lat and lng are required');
  }

  try {
    await ensureFleetTables();
    const driver = await findDriverByUserId(companyId, userId);
    if (!driver) {
      return errorResponse('No driver profile linked to this account', 403);
    }

    let trip = body.tripId ? await getTrip(companyId, body.tripId) : null;
    if (body.tripId && (!trip || trip.driverId !== driver.id)) {
      return errorResponse('Forbidden — not your trip', 403);
    }
    if (!trip) {
      trip = await findActiveTripForDriver(companyId, driver.id);
    }
    if (!trip || (trip.status !== 'in-transit' && trip.status !== 'delayed')) {
      return errorResponse('No active trip to track. Start a trip first.', 400);
    }

    const vehicleId = trip.vehicleId || driver.vehicleId;
    if (!vehicleId) {
      return errorResponse('No vehicle assigned to this trip', 400);
    }

    const vehicle = await getVehicle(companyId, vehicleId);
    if (!vehicle) return errorResponse('Vehicle not found', 404);

    if (vehicle.driverId && vehicle.driverId !== driver.id && trip.driverId !== driver.id) {
      return errorResponse('Forbidden — not your vehicle', 403);
    }

    const updated = await updateVehicleLiveLocation(companyId, vehicleId, {
      lat: body.lat,
      lng: body.lng,
      heading: body.heading,
      speed: body.speed,
    });

    return jsonResponse({
      vehicle: updated,
      tripId: trip.id,
      reportedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Report tracking error:', error);
    return errorResponse('Unable to report location', 500);
  }
}
