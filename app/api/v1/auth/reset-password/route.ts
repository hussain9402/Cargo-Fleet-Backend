import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse, optionsResponse, parseJsonBody } from '@/app/lib/auth/response';
import { resetPasswordSchema } from '@/app/lib/auth/validation';
import { ensureAuthTables, resetPassword } from '@/app/lib/auth/users';

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: NextRequest) {
  try {
    await ensureAuthTables();
    const body = await parseJsonBody(request);
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0]?.message ?? 'Invalid request body');
    }

    const result = await resetPassword(parsed.data);
    return jsonResponse(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_RESET_CODE') {
      return errorResponse('Invalid or expired reset code', 400);
    }
    console.error('Reset password error:', error);
    return errorResponse('Unable to reset password', 500);
  }
}
