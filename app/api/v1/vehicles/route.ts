import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse, optionsResponse, parseJsonBody } from '@/app/lib/auth/response';
import { requirePermission } from '@/app/lib/rbac/guard';
import { getClientIp, writeAudit } from '@/app/lib/rbac/audit';
import { createVehicle, ensureFleetTables, listVehicles, seedCompanyFleet } from '@/app/lib/fleet/fleet';

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: NextRequest) {
  const guard = await requirePermission(request, 'vehicles:view');
  if (!guard.ok) return guard.response;

  const { companyId } = guard.context;
  if (!companyId) return jsonResponse({ vehicles: [] });

  try {
    await ensureFleetTables();
    await seedCompanyFleet(companyId);
    const vehicles = await listVehicles(companyId);
    return jsonResponse({ vehicles });
  } catch (error) {
    console.error('List vehicles error:', error);
    return errorResponse('Unable to load vehicles', 500);
  }
}

export async function POST(request: NextRequest) {
  const guard = await requirePermission(request, 'vehicles:manage');
  if (!guard.ok) return guard.response;

  const { companyId, userId } = guard.context;
  if (!companyId) return errorResponse('No company context', 400);

  const body = await parseJsonBody<{ name?: string; plate?: string; model?: string }>(request);
  if (!body?.name || !body?.plate || !body?.model) {
    return errorResponse('name, plate and model are required');
  }

  try {
    await ensureFleetTables();
    const vehicle = await createVehicle(companyId, {
      name: body.name,
      plate: body.plate,
      model: body.model,
    });
    await writeAudit({
      companyId,
      userId,
      action: 'vehicle.create',
      resource: `vehicle:${vehicle.id}`,
      ip: getClientIp(request),
    });
    return jsonResponse({ vehicle }, 201);
  } catch (error) {
    console.error('Create vehicle error:', error);
    return errorResponse('Unable to create vehicle', 500);
  }
}
