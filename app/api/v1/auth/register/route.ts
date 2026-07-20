import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse, optionsResponse, parseJsonBody } from '@/app/lib/auth/response';
import { registerSchema } from '@/app/lib/auth/validation';
import { ensureAuthTables, registerUser } from '@/app/lib/auth/users';

export async function OPTIONS() {
  return optionsResponse();
}

/**
 * Legacy / invite join endpoint.
 * Creating a new company requires OTP: POST /auth/register/start then /auth/register/verify.
 * This route only allows joining an existing company (companyId required).
 */
export async function POST(request: NextRequest) {
  try {
    await ensureAuthTables();
    const body = await parseJsonBody(request);
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0]?.message ?? 'Invalid request body');
    }

    if (!parsed.data.companyId) {
      return errorResponse(
        'Company signup requires email verification. Use /api/v1/auth/register/start then /verify.',
        400,
      );
    }

    const result = await registerUser({
      email: parsed.data.email,
      password: parsed.data.password,
      fullName: parsed.data.fullName,
      companyId: parsed.data.companyId,
      role: parsed.data.role,
    });

    return jsonResponse(result, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'EMAIL_EXISTS') {
      return errorResponse('An account with this email already exists', 409);
    }
    if (error instanceof Error && error.message === 'COMPANY_NOT_FOUND') {
      return errorResponse('That company could not be found', 404);
    }
    console.error('Register error:', error);
    return errorResponse('Unable to create account', 500);
  }
}
