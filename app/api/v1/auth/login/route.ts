import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse, optionsResponse, parseJsonBody } from '@/app/lib/auth/response';
import { loginSchema } from '@/app/lib/auth/validation';
import { ensureAuthTables, loginUser } from '@/app/lib/auth/users';

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: NextRequest) {
  try {
    await ensureAuthTables();
    const body = await parseJsonBody(request);
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0]?.message ?? 'Invalid request body');
    }

    const result = await loginUser(parsed.data);
    return jsonResponse(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_CREDENTIALS') {
      return errorResponse('Invalid email or password', 401);
    }
    if (error instanceof Error && error.message === 'ACCOUNT_LOCKED') {
      return errorResponse('This account has been locked. Contact your administrator.', 403);
    }
    console.error('Login error:', error);
    return errorResponse('Unable to sign in', 500);
  }
}
