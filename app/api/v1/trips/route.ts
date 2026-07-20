import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse, optionsResponse, parseJsonBody } from '@/app/lib/auth/response';
import { requirePermission } from '@/app/lib/rbac/guard';
import { getClientIp, writeAudit } from '@/app/lib/rbac/audit';
import { canAny } from '@/app/lib/rbac/permissions';
import {
  createTrip,
  ensureFleetTables,
  listTripsScoped,
  resolveDataScope,
} from '@/app/lib/fleet/fleet';

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: NextRequest) {
  // Managers: trips:view · Drivers: trips:drive · Customers: shipments:track
  const guard = await requirePermission(request);
  if (!guard.ok) return guard.response;

  const { companyId, userId, roles } = guard.context;
  if (!canAny(roles, ['trips:view', 'trips:drive', 'shipments:track', 'trips:manage'])) {
    return errorResponse('Forbidden', 403);
  }
  if (!companyId) return jsonResponse({ trips: [] });

  try {
    await ensureFleetTables();
    const scope = resolveDataScope(roles);
    const trips = await listTripsScoped(companyId, scope, userId);
    return jsonResponse({ trips, scope });
  } catch (error) {
    console.error('List trips error:', error);
    return errorResponse('Unable to load trips', 500);
  }
}

export async function POST(request: NextRequest) {
  const guard = await requirePermission(request, 'trips:manage');
  if (!guard.ok) return guard.response;

  const { companyId, userId } = guard.context;
  if (!companyId) return errorResponse('No company context', 400);

  const body = await parseJsonBody<{
    origin?: string;
    destination?: string;
    vehicleId?: string;
    driverId?: string;
    customerUserId?: string;
    cargo?: string;
    distance?: number;
    departAt?: string;
    arriveAt?: string;
  }>(request);

  if (!body?.origin || !body?.destination) {
    return errorResponse('origin and destination are required');
  }

  try {
    await ensureFleetTables();
    const trip = await createTrip(companyId, {
      origin: body.origin,
      destination: body.destination,
      vehicleId: body.vehicleId,
      driverId: body.driverId,
      customerUserId: body.customerUserId,
      cargo: body.cargo,
      distance: body.distance,
      departAt: body.departAt,
      arriveAt: body.arriveAt,
    });
    await writeAudit({
      companyId,
      userId,
      action: 'trip.create',
      resource: `trip:${trip.id}`,
      ip: getClientIp(request),
    });
    return jsonResponse({ trip }, 201);
  } catch (error) {
    console.error('Create trip error:', error);
    return errorResponse('Unable to create trip', 500);
  }
}
