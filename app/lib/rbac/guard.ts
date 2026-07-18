import { NextRequest } from 'next/server';
import { getAuthPayload } from '../auth/request';
import { ensureAuthTables, findUserById, getUserRoles, getPrimaryUserRole } from '../auth/users';
import { errorResponse } from '../auth/response';
import { can, isPlatformRole, type Permission, type UserRole } from './permissions';

export type AuthContext = {
  userId: string;
  email: string;
  companyId: string | null;
  roles: UserRole[];
  primaryRole: UserRole | null;
  isPlatform: boolean;
};

type GuardSuccess = { ok: true; context: AuthContext };
type GuardFailure = { ok: false; response: ReturnType<typeof errorResponse> };
export type GuardResult = GuardSuccess | GuardFailure;

/**
 * Verify the bearer token, load fresh roles/company from the DB (so revoked
 * roles take effect immediately), and check the required permission.
 *
 * Usage in a route:
 *   const guard = await requirePermission(request, 'vehicles:manage');
 *   if (!guard.ok) return guard.response;
 *   const { companyId, userId } = guard.context;
 */
export async function requirePermission(
  request: NextRequest,
  permission?: Permission,
): Promise<GuardResult> {
  await ensureAuthTables();

  const payload = getAuthPayload(request);
  if (!payload || typeof payload.sub !== 'string') {
    return { ok: false, response: errorResponse('Unauthorized', 401) };
  }

  const user = await findUserById(payload.sub);
  if (!user) {
    return { ok: false, response: errorResponse('Unauthorized', 401) };
  }

  const roles = await getUserRoles(user.id);
  const primaryRole = await getPrimaryUserRole(user.id);

  if (permission && !can(roles, permission)) {
    return { ok: false, response: errorResponse('Forbidden', 403) };
  }

  const platform = roles.some((role) => isPlatformRole(role));

  return {
    ok: true,
    context: {
      userId: user.id,
      email: user.email,
      companyId: user.company_id,
      roles,
      primaryRole,
      isPlatform: platform,
    },
  };
}

/** Just require a valid session (no specific permission). */
export function requireAuth(request: NextRequest) {
  return requirePermission(request);
}
