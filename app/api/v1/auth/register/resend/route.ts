import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse, optionsResponse, parseJsonBody } from '@/app/lib/auth/response';
import { registerResendSchema } from '@/app/lib/auth/validation';
import { ensureAuthTables, resendCompanyRegistrationOtp } from '@/app/lib/auth/users';

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: NextRequest) {
  try {
    await ensureAuthTables();
    const body = await parseJsonBody(request);
    const parsed = registerResendSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0]?.message ?? 'Invalid request body');
    }

    const result = await resendCompanyRegistrationOtp(parsed.data.email);
    return jsonResponse(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'PENDING_NOT_FOUND') {
      return errorResponse('No pending registration found for that email. Start signup again.', 404);
    }
    if (error instanceof Error && error.message === 'SMTP_NOT_CONFIGURED') {
      return errorResponse(
        'Email verification is not configured. Ask the platform admin to set SMTP in Super Admin → Settings.',
        503,
      );
    }
    console.error('Register resend error:', error);
    return errorResponse('Unable to resend code', 500);
  }
}
