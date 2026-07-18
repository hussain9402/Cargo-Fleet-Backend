import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse, optionsResponse, parseJsonBody } from '@/app/lib/auth/response';
import { requirePermission } from '@/app/lib/rbac/guard';
import { getClientIp, writeAudit } from '@/app/lib/rbac/audit';
import { createCompany, listCompanies } from '@/app/lib/auth/users';

export async function OPTIONS() {
  return optionsResponse();
}

// Only platform (super_admin, via '*') and company:manage holders can list companies.
export async function GET(request: NextRequest) {
  const guard = await requirePermission(request, 'company:manage');
  if (!guard.ok) return guard.response;

  const { isPlatform, companyId } = guard.context;

  try {
    const companies = await listCompanies();
    // Non-platform managers only see their own company.
    const scoped = isPlatform ? companies : companies.filter((c) => c.id === companyId);
    return jsonResponse({ companies: scoped });
  } catch (error) {
    console.error('List companies error:', error);
    return errorResponse('Unable to load companies', 500);
  }
}

export async function POST(request: NextRequest) {
  const guard = await requirePermission(request, 'company:manage');
  if (!guard.ok) return guard.response;

  if (!guard.context.isPlatform) {
    return errorResponse('Only the platform admin can create companies', 403);
  }

  const body = await parseJsonBody<{ name?: string }>(request);
  if (!body?.name) return errorResponse('Company name is required');

  try {
    const company = await createCompany(body.name);
    await writeAudit({
      companyId: company.id,
      userId: guard.context.userId,
      action: 'company.create',
      resource: `company:${company.id}`,
      ip: getClientIp(request),
    });
    return jsonResponse({ company }, 201);
  } catch (error) {
    console.error('Create company error:', error);
    return errorResponse('Unable to create company', 500);
  }
}
