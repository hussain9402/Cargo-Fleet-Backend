import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse, optionsResponse, parseJsonBody } from '@/app/lib/auth/response';
import { requireAuth } from '@/app/lib/rbac/guard';
import { toAuthUser, findUserById, updateOwnProfile } from '@/app/lib/auth/users';

export async function OPTIONS() {
  return optionsResponse();
}

// Update the signed-in user's own name / password.
export async function PATCH(request: NextRequest) {
  const guard = await requireAuth(request);
  if (!guard.ok) return guard.response;

  const { userId } = guard.context;
  const body = await parseJsonBody<{ name?: string; currentPassword?: string; newPassword?: string }>(
    request,
  );
  if (!body || (body.name === undefined && !body.newPassword)) {
    return errorResponse('Nothing to update');
  }
  if (body.newPassword && body.newPassword.length < 6) {
    return errorResponse('New password must be at least 6 characters');
  }

  try {
    await updateOwnProfile(userId, {
      name: body.name,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
    });
    const user = await findUserById(userId);
    return jsonResponse({ user: user ? await toAuthUser(user) : null });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ERROR';
    if (message === 'INVALID_CURRENT_PASSWORD' || message === 'CURRENT_PASSWORD_REQUIRED') {
      return errorResponse('Current password is incorrect', 400);
    }
    console.error('Update account error:', error);
    return errorResponse('Unable to update account', 500);
  }
}
