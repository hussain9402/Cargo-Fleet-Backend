import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse, optionsResponse } from '@/app/lib/auth/response';
import { requirePermission } from '@/app/lib/rbac/guard';
import { ensureFleetTables, getDashboardSummary, seedCompanyFleet } from '@/app/lib/fleet/fleet';

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: NextRequest) {
  const guard = await requirePermission(request, 'dashboard:view');
  if (!guard.ok) return guard.response;

  const { companyId, roles, primaryRole } = guard.context;
  if (!companyId) {
    return jsonResponse({ summary: null, roles, primaryRole });
  }

  try {
    await ensureFleetTables();
    await seedCompanyFleet(companyId);
    const summary = await getDashboardSummary(companyId);
    return jsonResponse({ summary, roles, primaryRole });
  } catch (error) {
    console.error('Dashboard error:', error);
    return errorResponse('Unable to load dashboard', 500);
  }
}
