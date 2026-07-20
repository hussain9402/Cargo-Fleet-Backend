import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse, optionsResponse, parseJsonBody } from '@/app/lib/auth/response';
import { registerVerifySchema } from '@/app/lib/auth/validation';
import { ensureAuthTables, verifyCompanyRegistration } from '@/app/lib/auth/users';

export async function OPTIONS() {
  return optionsResponse();
}

/** Step 2: verify OTP → create empty company tenant + owner session. */
export async function POST(request: NextRequest) {
  try {
    await ensureAuthTables();
    const body = await parseJsonBody(request);
    const parsed = registerVerifySchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0]?.message ?? 'Invalid request body');
    }

    const result = await verifyCompanyRegistration(parsed.data);
    return jsonResponse(result, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_OTP') {
      return errorResponse('Invalid or expired verification code', 400);
    }
    if (error instanceof Error && error.message === 'EMAIL_EXISTS') {
      return errorResponse('An account with this email already exists', 409);
    }
    console.error('Register verify error:', error);
    return errorResponse('Unable to verify registration', 500);
  }
}
