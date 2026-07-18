import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse, optionsResponse, parseJsonBody } from '@/app/lib/auth/response';
import { requirePermission } from '@/app/lib/rbac/guard';
import { getClientIp, writeAudit } from '@/app/lib/rbac/audit';
import { isRole, type UserRole } from '@/app/lib/rbac/permissions';
import {
  deleteUserById,
  findUserById,
  resetUserPassword,
  setUserStatus,
  updateManagedUserDetails,
  updateUserRole,
} from '@/app/lib/auth/users';

export async function OPTIONS() {
  return optionsResponse();
}

/**
 * Confirm the actor may manage the target user:
 *  - platform (super_admin) may manage anyone
 *  - otherwise the target must be in the actor's company
 */
async function authorizeTarget(
  targetId: string,
  isPlatform: boolean,
  actorCompanyId: string | null,
) {
  const target = await findUserById(targetId);
  if (!target) return { ok: false as const, code: 404 };
  if (!isPlatform && target.company_id !== actorCompanyId) {
    return { ok: false as const, code: 403 };
  }
  return { ok: true as const, target };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission(request, 'users:manage');
  if (!guard.ok) return guard.response;

  const { isPlatform, companyId, userId } = guard.context;
  const { id } = await params;

  const auth = await authorizeTarget(id, isPlatform, companyId);
  if (!auth.ok) return errorResponse(auth.code === 404 ? 'User not found' : 'Forbidden', auth.code);

  const body = await parseJsonBody<{
    role?: string;
    status?: string;
    password?: string;
    name?: string;
    email?: string;
  }>(request);
  if (!body || (!body.role && !body.status && !body.password && body.name === undefined && !body.email)) {
    return errorResponse('Nothing to update');
  }

  try {
    if (body.name !== undefined || body.email) {
      await updateManagedUserDetails(id, { name: body.name, email: body.email });
    }
    if (body.role) {
      if (!isRole(body.role) || body.role === 'super_admin') return errorResponse('Invalid role');
      await updateUserRole(id, body.role as UserRole);
    }
    if (body.status) {
      if (body.status !== 'active' && body.status !== 'suspended') {
        return errorResponse('Invalid status');
      }
      await setUserStatus(id, body.status);
    }
    if (body.password) {
      if (body.password.length < 6) return errorResponse('Password too short');
      await resetUserPassword(id, body.password);
    }

    await writeAudit({
      companyId: auth.target.company_id,
      userId,
      action: 'user.update',
      resource: `user:${id}`,
      ip: getClientIp(request),
      detail: {
        role: body.role,
        status: body.status,
        passwordReset: !!body.password,
        detailsChanged: body.name !== undefined || !!body.email,
      },
    });

    const updated = await findUserById(id);
    return jsonResponse({ id, status: updated?.status });
  } catch (error) {
    if (error instanceof Error && error.message === 'EMAIL_EXISTS') {
      return errorResponse('Another account already uses this email', 409);
    }
    console.error('Update user error:', error);
    return errorResponse('Unable to update user', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission(request, 'users:manage');
  if (!guard.ok) return guard.response;

  const { isPlatform, companyId, userId } = guard.context;
  const { id } = await params;

  if (id === userId) return errorResponse('You cannot delete your own account', 400);

  const auth = await authorizeTarget(id, isPlatform, companyId);
  if (!auth.ok) return errorResponse(auth.code === 404 ? 'User not found' : 'Forbidden', auth.code);

  try {
    await deleteUserById(id);
    await writeAudit({
      companyId: auth.target.company_id,
      userId,
      action: 'user.delete',
      resource: `user:${id}`,
      ip: getClientIp(request),
    });
    return jsonResponse({ id });
  } catch (error) {
    console.error('Delete user error:', error);
    return errorResponse('Unable to delete user', 500);
  }
}
