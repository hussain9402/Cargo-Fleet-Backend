import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse, optionsResponse } from '@/app/lib/auth/response';
import { requirePermission } from '@/app/lib/rbac/guard';
import { query } from '@/app/lib/db';

export async function OPTIONS() {
  return optionsResponse();
}

// Company owners (company:manage) and super_admin can read the audit trail.
export async function GET(request: NextRequest) {
  const guard = await requirePermission(request, 'company:manage');
  if (!guard.ok) return guard.response;

  const { companyId, isPlatform } = guard.context;

  try {
    const rows = isPlatform
      ? await query<any[]>(
          `SELECT id, company_id, user_id, action, resource, ip, detail, created_at
           FROM audit_logs ORDER BY created_at DESC LIMIT 200`,
        )
      : await query<any[]>(
          `SELECT id, company_id, user_id, action, resource, ip, detail, created_at
           FROM audit_logs WHERE company_id = ? ORDER BY created_at DESC LIMIT 200`,
          [companyId],
        );
    return jsonResponse({ logs: rows });
  } catch (error) {
    console.error('Audit list error:', error);
    return errorResponse('Unable to load audit logs', 500);
  }
}
