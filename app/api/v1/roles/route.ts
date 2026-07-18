import { NextRequest } from 'next/server';
import { jsonResponse, optionsResponse } from '@/app/lib/auth/response';
import { requirePermission } from '@/app/lib/rbac/guard';
import { ROLES, ROLE_PERMISSIONS } from '@/app/lib/rbac/permissions';
import { listManagedUsers } from '@/app/lib/auth/users';

export async function OPTIONS() {
  return optionsResponse();
}

// Read-only role catalogue (permissions are code-defined) plus per-tenant user counts.
export async function GET(request: NextRequest) {
  const guard = await requirePermission(request, 'users:view');
  if (!guard.ok) return guard.response;

  const { isPlatform, companyId } = guard.context;

  const users = await listManagedUsers(isPlatform ? null : companyId);
  const counts: Record<string, number> = {};
  for (const u of users) {
    if (u.role) counts[u.role] = (counts[u.role] ?? 0) + 1;
  }

  const roles = ROLES.filter((r) => isPlatform || r !== 'super_admin').map((role) => ({
    role,
    permissions: ROLE_PERMISSIONS[role],
    userCount: counts[role] ?? 0,
  }));

  return jsonResponse({ roles });
}
