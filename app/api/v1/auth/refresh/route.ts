import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse, optionsResponse, parseJsonBody } from '@/app/lib/auth/response';
import { refreshSchema } from '@/app/lib/auth/validation';
import { ensureAuthTables, refreshAuthSession } from '@/app/lib/auth/users';

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: NextRequest) {
  try {
    await ensureAuthTables();
    const body = await parseJsonBody(request);
    const parsed = refreshSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0]?.message ?? 'Invalid request body');
    }

    const result = await refreshAuthSession(parsed.data.refreshToken);
    return jsonResponse(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_REFRESH_TOKEN') {
      return errorResponse('Invalid refresh token', 401);
    }
    console.error('Refresh error:', error);
    return errorResponse('Unable to refresh session', 500);
  }
}
