import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse, optionsResponse } from '@/app/lib/auth/response';
import { requirePermission } from '@/app/lib/rbac/guard';
import { canAny } from '@/app/lib/rbac/permissions';
import { ensureFleetTables, listDriversScoped, resolveDataScope } from '@/app/lib/fleet/fleet';

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: NextRequest) {
  const guard = await requirePermission(request);
  if (!guard.ok) return guard.response;

  const { companyId, userId, roles } = guard.context;
  // Drivers may read their own profile via tracking:own / trips:drive
  if (!canAny(roles, ['drivers:view', 'drivers:manage', 'tracking:own', 'trips:drive'])) {
    return errorResponse("You don't have permission to perform this action.", 403);
  }
  if (!companyId) return jsonResponse({ drivers: [] });

  try {
    await ensureFleetTables();
    const scope = resolveDataScope(roles);
    const drivers = await listDriversScoped(companyId, scope, userId);
    return jsonResponse({ drivers, scope });
  } catch (error) {
    console.error('List drivers error:', error);
    return errorResponse('Unable to load drivers', 500);
  }
}
