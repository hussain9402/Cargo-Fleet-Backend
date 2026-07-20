import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse, optionsResponse, parseJsonBody } from '@/app/lib/auth/response';
import { registerStartSchema } from '@/app/lib/auth/validation';
import { ensureAuthTables, startCompanyRegistration } from '@/app/lib/auth/users';

export async function OPTIONS() {
  return optionsResponse();
}

/** Step 1: store pending signup + email OTP (account is NOT created yet). */
export async function POST(request: NextRequest) {
  try {
    await ensureAuthTables();
    const body = await parseJsonBody(request);
    const parsed = registerStartSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0]?.message ?? 'Invalid request body');
    }

    const result = await startCompanyRegistration(parsed.data);
    return jsonResponse(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'EMAIL_EXISTS') {
      return errorResponse('An account with this email already exists', 409);
    }
    if (error instanceof Error && error.message === 'SMTP_NOT_CONFIGURED') {
      return errorResponse(
        'Email verification is not configured. Ask the platform admin to set SMTP in Super Admin → Settings.',
        503,
      );
    }
    console.error('Register start error:', error);
    return errorResponse('Unable to start registration', 500);
  }
}
