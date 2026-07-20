import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse, optionsResponse } from '@/app/lib/auth/response';
import { requirePermission } from '@/app/lib/rbac/guard';
import { ensureFleetTables, getDashboardSummary, resolveDataScope } from '@/app/lib/fleet/fleet';

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: NextRequest) {
  const guard = await requirePermission(request, 'dashboard:view');
  if (!guard.ok) return guard.response;

  const { companyId, roles, primaryRole, userId } = guard.context;
  if (!companyId) {
    return jsonResponse({ summary: null, roles, primaryRole, scope: null });
  }

  try {
    await ensureFleetTables();
    const scope = resolveDataScope(roles);
    const summary = await getDashboardSummary(companyId, scope, userId);
    return jsonResponse({ summary, roles, primaryRole, scope });
  } catch (error) {
    console.error('Dashboard error:', error);
    return errorResponse('Unable to load dashboard', 500);
  }
}
