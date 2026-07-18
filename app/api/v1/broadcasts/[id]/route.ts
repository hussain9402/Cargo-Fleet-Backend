import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse, optionsResponse } from '@/app/lib/auth/response';
import { requirePermission } from '@/app/lib/rbac/guard';
import { PLATFORM_SCOPE, deleteBroadcast } from '@/app/lib/admin/admin';

export async function OPTIONS() {
  return optionsResponse();
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission(request, 'settings:manage');
  if (!guard.ok) return guard.response;

  const { isPlatform, companyId } = guard.context;
  const scope = isPlatform ? PLATFORM_SCOPE : companyId;
  if (!scope) return errorResponse('No scope', 400);

  const { id } = await params;
  await deleteBroadcast(id, scope);
  return jsonResponse({ id });
}
