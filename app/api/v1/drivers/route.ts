import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse, optionsResponse } from '@/app/lib/auth/response';
import { requirePermission } from '@/app/lib/rbac/guard';
import { ensureFleetTables, listDrivers, seedCompanyFleet } from '@/app/lib/fleet/fleet';

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: NextRequest) {
  const guard = await requirePermission(request, 'drivers:view');
  if (!guard.ok) return guard.response;

  const { companyId } = guard.context;
  if (!companyId) return jsonResponse({ drivers: [] });

  try {
    await ensureFleetTables();
    await seedCompanyFleet(companyId);
    const drivers = await listDrivers(companyId);
    return jsonResponse({ drivers });
  } catch (error) {
    console.error('List drivers error:', error);
    return errorResponse('Unable to load drivers', 500);
  }
}
