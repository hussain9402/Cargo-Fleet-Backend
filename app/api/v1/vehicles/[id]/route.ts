import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse, optionsResponse, parseJsonBody } from '@/app/lib/auth/response';
import { requirePermission } from '@/app/lib/rbac/guard';
import { getClientIp, writeAudit } from '@/app/lib/rbac/audit';
import { can } from '@/app/lib/rbac/permissions';
import { ensureFleetTables, getVehicle, updateVehicleStatus, type VehicleStatus } from '@/app/lib/fleet/fleet';

const VALID_STATUSES: VehicleStatus[] = ['moving', 'idle', 'maintenance', 'offline'];

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission(request, 'vehicles:view');
  if (!guard.ok) return guard.response;

  const { companyId } = guard.context;
  if (!companyId) return errorResponse('No company context', 400);

  const { id } = await params;
  await ensureFleetTables();
  const vehicle = await getVehicle(companyId, id);
  if (!vehicle) return errorResponse('Vehicle not found', 404);
  return jsonResponse({ vehicle });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Either fleet managers (manage) or maintenance managers (maintenance) may update status.
  const guard = await requirePermission(request);
  if (!guard.ok) return guard.response;

  const { companyId, userId, roles } = guard.context;
  if (!can(roles, 'vehicles:manage') && !can(roles, 'vehicles:maintenance')) {
    return errorResponse('Forbidden', 403);
  }
  if (!companyId) return errorResponse('No company context', 400);

  const { id } = await params;
  const body = await parseJsonBody<{ status?: string }>(request);
  if (!body?.status || !VALID_STATUSES.includes(body.status as VehicleStatus)) {
    return errorResponse('A valid status is required');
  }

  try {
    await ensureFleetTables();
    const vehicle = await updateVehicleStatus(companyId, id, body.status as VehicleStatus);
    if (!vehicle) return errorResponse('Vehicle not found', 404);
    await writeAudit({
      companyId,
      userId,
      action: 'vehicle.status',
      resource: `vehicle:${id}`,
      ip: getClientIp(request),
      detail: { status: body.status },
    });
    return jsonResponse({ vehicle });
  } catch (error) {
    console.error('Update vehicle error:', error);
    return errorResponse('Unable to update vehicle', 500);
  }
}
