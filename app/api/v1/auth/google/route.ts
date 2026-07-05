import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse, optionsResponse, parseJsonBody } from '@/app/lib/auth/response';
import { googleAuthSchema } from '@/app/lib/auth/validation';
import { ensureAuthTables, loginWithGoogle } from '@/app/lib/auth/users';

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: NextRequest) {
  try {
    await ensureAuthTables();
    const body = await parseJsonBody(request);
    const parsed = googleAuthSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0]?.message ?? 'Invalid request body');
    }

    const result = await loginWithGoogle(parsed.data.idToken);
    return jsonResponse(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'INVALID_GOOGLE_TOKEN') {
        return errorResponse('Invalid Google sign-in token', 401);
      }
      if (error.message === 'GOOGLE_NOT_CONFIGURED') {
        return errorResponse('Google sign-in is not configured on the server', 503);
      }
      if (error.message === 'GOOGLE_EMAIL_NOT_VERIFIED') {
        return errorResponse('Google account email is not verified', 403);
      }
    }
    console.error('Google auth error:', error);
    return errorResponse('Unable to sign in with Google', 500);
  }
}
