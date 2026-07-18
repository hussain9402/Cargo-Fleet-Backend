import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse, optionsResponse, parseJsonBody } from '@/app/lib/auth/response';
import { requirePermission } from '@/app/lib/rbac/guard';
import { getClientIp, writeAudit } from '@/app/lib/rbac/audit';
import { isRole, type UserRole } from '@/app/lib/rbac/permissions';
import { createManagedUser, listManagedUsers } from '@/app/lib/auth/users';

export async function OPTIONS() {
  return optionsResponse();
}

// List users. Super admin sees all (or ?companyId=); company managers see their own company.
export async function GET(request: NextRequest) {
  const guard = await requirePermission(request, 'users:manage');
  if (!guard.ok) return guard.response;

  const { isPlatform, companyId } = guard.context;

  try {
    let scope: string | null;
    if (isPlatform) {
      scope = request.nextUrl.searchParams.get('companyId');
    } else {
      scope = companyId;
      if (!scope) return jsonResponse({ users: [] });
    }
    const users = await listManagedUsers(scope);
    return jsonResponse({ users });
  } catch (error) {
    console.error('List users error:', error);
    return errorResponse('Unable to load users', 500);
  }
}

// Invite / create a user within a company.
export async function POST(request: NextRequest) {
  const guard = await requirePermission(request, 'users:manage');
  if (!guard.ok) return guard.response;

  const { isPlatform, companyId, userId } = guard.context;

  const body = await parseJsonBody<{
    email?: string;
    fullName?: string;
    password?: string;
    role?: string;
    companyId?: string;
  }>(request);

  if (!body?.email || !body?.fullName || !body?.password || !body?.role) {
    return errorResponse('email, fullName, password and role are required');
  }
  if (!isRole(body.role) || body.role === 'super_admin') {
    return errorResponse('Invalid role');
  }

  const targetCompany = isPlatform ? body.companyId ?? companyId : companyId;
  if (!targetCompany) {
    return errorResponse('A target company is required');
  }

  try {
    const id = await createManagedUser({
      companyId: targetCompany,
      email: body.email,
      fullName: body.fullName,
      password: body.password,
      role: body.role as UserRole,
    });
    await writeAudit({
      companyId: targetCompany,
      userId,
      action: 'user.create',
      resource: `user:${id}`,
      ip: getClientIp(request),
      detail: { role: body.role },
    });
    return jsonResponse({ id }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'EMAIL_EXISTS') {
      return errorResponse('An account with this email already exists', 409);
    }
    console.error('Create user error:', error);
    return errorResponse('Unable to create user', 500);
  }
}
