import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse, optionsResponse, parseJsonBody } from '@/app/lib/auth/response';
import { requirePermission } from '@/app/lib/rbac/guard';
import { getClientIp, writeAudit } from '@/app/lib/rbac/audit';
import { can } from '@/app/lib/rbac/permissions';
import {
  ensureFleetTables,
  findDriverByUserId,
  getTrip,
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
  const body = await parseJsonBody<{ status?: string; progress?: number }>(request);
  if (!body?.status || !VALID.includes(body.status as Trip['status'])) {
    return errorResponse('A valid status is required');
  }

  try {
    await ensureFleetTables();
    const existing = await getTrip(companyId, id);
    if (!existing) return errorResponse('Trip not found', 404);

    // Drivers may only update their own assigned trips.
    if (!can(roles, 'trips:manage') && can(roles, 'trips:drive')) {
      const driver = await findDriverByUserId(companyId, userId);
      if (!driver || existing.driverId !== driver.id) {
        return errorResponse('Forbidden — not your trip', 403);
      }
    }

    const trip = await updateTripStatus(companyId, id, body.status as Trip['status'], body.progress);
    if (!trip) return errorResponse('Trip not found', 404);
    await writeAudit({
      companyId,
      userId,
      action: 'trip.status',
      resource: `trip:${id}`,
      ip: getClientIp(request),
      detail: { status: body.status, progress: body.progress },
    });
    return jsonResponse({ trip });
  } catch (error) {
    console.error('Update trip error:', error);
    return errorResponse('Unable to update trip', 500);
  }
}
