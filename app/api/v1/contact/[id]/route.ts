import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse, optionsResponse, parseJsonBody } from '@/app/lib/auth/response';
import { requirePermission } from '@/app/lib/rbac/guard';
import { setContactStatus } from '@/app/lib/admin/admin';

export async function OPTIONS() {
  return optionsResponse();
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission(request, 'settings:manage');
  if (!guard.ok) return guard.response;

  const { isPlatform, companyId } = guard.context;
  const { id } = await params;

  const body = await parseJsonBody<{ status?: string }>(request);
  if (body?.status !== 'open' && body?.status !== 'resolved') {
    return errorResponse('Invalid status');
  }

  await setContactStatus(id, body.status, isPlatform ? null : companyId);
  return jsonResponse({ id, status: body.status });
}
