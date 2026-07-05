import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse, optionsResponse, parseJsonBody } from '@/app/lib/auth/response';
import { forgotPasswordSchema } from '@/app/lib/auth/validation';
import { ensureAuthTables, requestPasswordReset } from '@/app/lib/auth/users';
import { isSmtpConfigured } from '@/app/lib/auth/mail';

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: NextRequest) {
  try {
    if (!isSmtpConfigured()) {
      return errorResponse('Password reset email is not configured on the server', 503);
    }

    await ensureAuthTables();
    const body = await parseJsonBody(request);
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0]?.message ?? 'Invalid request body');
    }

    const result = await requestPasswordReset(parsed.data.email);
    return jsonResponse(result);
  } catch (error) {
    console.error('Forgot password error:', error);
    return errorResponse('Unable to send reset email', 500);
  }
}
