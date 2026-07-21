import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse, optionsResponse, parseJsonBody } from '@/app/lib/auth/response';
import { requirePermission } from '@/app/lib/rbac/guard';
import { getClientIp, writeAudit } from '@/app/lib/rbac/audit';
import { can } from '@/app/lib/rbac/permissions';
import {
  deleteTrip,
  ensureFleetTables,
  findDriverByUserId,
  getTrip,
  updateTrip,
  updateTripStatus,
  type Trip,
} from '@/app/lib/fleet/fleet';

const VALID: Trip['status'][] = ['in-transit', 'scheduled', 'completed', 'delayed'];

export async function OPTIONS() {
  return optionsResponse();
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission(request);
  if (!guard.ok) return guard.response;

  const { companyId, userId, roles } = guard.context;
  if (!can(roles, 'trips:manage') && !can(roles, 'trips:drive')) {
    return errorResponse('Forbidden', 403);
  }
  if (!companyId) return errorResponse('No company context', 400);

  const { id } = await params;
  const body = await parseJsonBody<{
    status?: string;
    progress?: number;
    origin?: string;
    destination?: string;
    vehicleId?: string | null;
    driverId?: string | null;
    customerUserId?: string | null;
    cargo?: string;
    distance?: number;
    departAt?: string;
    arriveAt?: string;
  }>(request);

  if (!body) return errorResponse('Invalid body');

  const hasFields =
    body.origin !== undefined ||
    body.destination !== undefined ||
    body.vehicleId !== undefined ||
    body.driverId !== undefined ||
    body.customerUserId !== undefined ||
    body.cargo !== undefined ||
    body.distance !== undefined ||
    body.departAt !== undefined ||
    body.arriveAt !== undefined;

  const hasStatus = body.status !== undefined;

  if (!hasFields && !hasStatus) {
    return errorResponse('Nothing to update');
  }

  if (hasFields && !can(roles, 'trips:manage')) {
    return errorResponse('Forbidden', 403);
  }

  if (hasStatus && (!body.status || !VALID.includes(body.status as Trip['status']))) {
    return errorResponse('A valid status is required');
  }

  try {
    await ensureFleetTables();
    const existing = await getTrip(companyId, id);
    if (!existing) return errorResponse('Trip not found', 404);

    // Drivers may only update status on their own assigned trips.
    if (!can(roles, 'trips:manage') && can(roles, 'trips:drive')) {
      const driver = await findDriverByUserId(companyId, userId);
      if (!driver || existing.driverId !== driver.id) {
        return errorResponse('Forbidden — not your trip', 403);
      }
    }

    let trip: Trip | null = existing;

    if (hasFields) {
      const origin = body.origin?.trim();
      const destination = body.destination?.trim();
      if (body.origin !== undefined && !origin) {
        return errorResponse('origin cannot be empty');
      }
      if (body.destination !== undefined && !destination) {
        return errorResponse('destination cannot be empty');
      }

      trip = await updateTrip(companyId, id, {
        origin,
        destination,
        vehicleId: body.vehicleId,
        driverId: body.driverId,
        customerUserId: body.customerUserId,
        cargo: body.cargo,
        distance: body.distance,
        departAt: body.departAt,
        arriveAt: body.arriveAt,
        ...(hasStatus
          ? {
              status: body.status as Trip['status'],
              progress: body.progress,
            }
          : {}),
      });
      await writeAudit({
        companyId,
        userId,
        action: 'trip.update',
        resource: `trip:${id}`,
        ip: getClientIp(request),
      });
    } else if (hasStatus) {
      trip = await updateTripStatus(companyId, id, body.status as Trip['status'], body.progress);
      await writeAudit({
        companyId,
        userId,
        action: 'trip.status',
        resource: `trip:${id}`,
        ip: getClientIp(request),
        detail: { status: body.status, progress: body.progress },
      });
    }

    if (!trip) return errorResponse('Trip not found', 404);
    return jsonResponse({ trip });
  } catch (error) {
    console.error('Update trip error:', error);
    return errorResponse('Unable to update trip', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission(request, 'trips:manage');
  if (!guard.ok) return guard.response;

  const { companyId, userId } = guard.context;
  if (!companyId) return errorResponse('No company context', 400);

  const { id } = await params;

  try {
    await ensureFleetTables();
    const ok = await deleteTrip(companyId, id);
    if (!ok) return errorResponse('Trip not found', 404);
    await writeAudit({
      companyId,
      userId,
      action: 'trip.delete',
      resource: `trip:${id}`,
      ip: getClientIp(request),
    });
    return jsonResponse({ ok: true });
  } catch (error) {
    console.error('Delete trip error:', error);
    return errorResponse('Unable to delete trip', 500);
  }
}
