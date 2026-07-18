import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse, optionsResponse, parseJsonBody } from '@/app/lib/auth/response';
import { requirePermission } from '@/app/lib/rbac/guard';
import { getClientIp, writeAudit } from '@/app/lib/rbac/audit';
import { deleteCompany, findCompanyById, updateCompany } from '@/app/lib/auth/users';

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission(request, 'company:manage');
  if (!guard.ok) return guard.response;

  const { isPlatform, companyId } = guard.context;
  const { id } = await params;
  if (!isPlatform && id !== companyId) return errorResponse('Forbidden', 403);

  const company = await findCompanyById(id);
  if (!company) return errorResponse('Company not found', 404);
  return jsonResponse({ company });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission(request, 'company:manage');
  if (!guard.ok) return guard.response;

  const { isPlatform, companyId, userId } = guard.context;
  const { id } = await params;

  // Owners may edit only their own company; only platform may suspend/activate.
  if (!isPlatform && id !== companyId) return errorResponse('Forbidden', 403);

  const body = await parseJsonBody<{ name?: string; status?: string }>(request);
  if (!body || (body.name === undefined && body.status === undefined)) {
    return errorResponse('Nothing to update');
  }
  if (body.status !== undefined) {
    if (!isPlatform) return errorResponse('Only the platform admin can change company status', 403);
    if (body.status !== 'active' && body.status !== 'suspended') {
      return errorResponse('Invalid status');
    }
  }

  try {
    const company = await updateCompany(id, {
      name: body.name,
      status: body.status as 'active' | 'suspended' | undefined,
    });
    await writeAudit({
      companyId: id,
      userId,
      action: 'company.update',
      resource: `company:${id}`,
      ip: getClientIp(request),
      detail: { name: body.name, status: body.status },
    });
    return jsonResponse({ company });
  } catch (error) {
    console.error('Update company error:', error);
    return errorResponse('Unable to update company', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission(request, 'company:manage');
  if (!guard.ok) return guard.response;

  if (!guard.context.isPlatform) {
    return errorResponse('Only the platform admin can delete companies', 403);
  }

  const { id } = await params;
  try {
    await deleteCompany(id);
    await writeAudit({
      companyId: id,
      userId: guard.context.userId,
      action: 'company.delete',
      resource: `company:${id}`,
      ip: getClientIp(request),
    });
    return jsonResponse({ id });
  } catch (error) {
    console.error('Delete company error:', error);
    return errorResponse('Unable to delete company', 500);
  }
}
