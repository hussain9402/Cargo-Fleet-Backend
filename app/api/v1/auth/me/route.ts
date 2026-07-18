import { NextRequest } from 'next/server';
import { getAuthPayload } from '@/app/lib/auth/request';
import { errorResponse, jsonResponse, optionsResponse, parseJsonBody } from '@/app/lib/auth/response';
import { roleSchema } from '@/app/lib/auth/validation';
import { ensureAuthTables, findUserById, toAuthUser, updateUserRole } from '@/app/lib/auth/users';
import { getClientIp, writeAudit } from '@/app/lib/rbac/audit';

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: NextRequest) {
  try {
    await ensureAuthTables();
    const payload = getAuthPayload(request);
    if (!payload) {
      return errorResponse('Unauthorized', 401);
    }

    const user = await findUserById(payload.sub as string);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    return jsonResponse({ user: await toAuthUser(user) });
  } catch (error) {
    console.error('Me error:', error);
    return errorResponse('Unable to fetch profile', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await ensureAuthTables();
    const payload = getAuthPayload(request);
    if (!payload) {
      return errorResponse('Unauthorized', 401);
    }

    const body = await parseJsonBody(request);
    const parsed = roleSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0]?.message ?? 'Invalid request body');
    }

    const user = await updateUserRole(payload.sub as string, parsed.data.role);

    await writeAudit({
      companyId: user.companyId,
      userId: user.id,
      action: 'role.change',
      resource: `user:${user.id}`,
      ip: getClientIp(request),
      detail: { role: parsed.data.role },
    });

    return jsonResponse({ user });
  } catch (error) {
    console.error('Role update error:', error);
    return errorResponse('Unable to update role', 500);
  }
}
