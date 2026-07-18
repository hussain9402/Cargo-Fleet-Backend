import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse, optionsResponse, parseJsonBody } from '@/app/lib/auth/response';
import { requirePermission } from '@/app/lib/rbac/guard';
import { getClientIp, writeAudit } from '@/app/lib/rbac/audit';
import { PLATFORM_SCOPE, getSettings, upsertSettings } from '@/app/lib/admin/admin';

export async function OPTIONS() {
  return optionsResponse();
}

function scopeFor(isPlatform: boolean, companyId: string | null) {
  return isPlatform ? PLATFORM_SCOPE : companyId;
}

export async function GET(request: NextRequest) {
  const guard = await requirePermission(request, 'settings:manage');
  if (!guard.ok) return guard.response;

  const scope = scopeFor(guard.context.isPlatform, guard.context.companyId);
  if (!scope) return errorResponse('No scope for settings', 400);

  const settings = await getSettings(scope);
  return jsonResponse({ settings });
}

export async function PATCH(request: NextRequest) {
  const guard = await requirePermission(request, 'settings:manage');
  if (!guard.ok) return guard.response;

  const { isPlatform, companyId, userId } = guard.context;
  const scope = scopeFor(isPlatform, companyId);
  if (!scope) return errorResponse('No scope for settings', 400);

  const body = await parseJsonBody<Record<string, unknown>>(request);
  if (!body) return errorResponse('Nothing to update');

  try {
    const settings = await upsertSettings(scope, {
      timezone: body.timezone as string | undefined,
      locale: body.locale as string | undefined,
      theme: body.theme as string | undefined,
      weeklyReport: body.weeklyReport as boolean | undefined,
      itemsPerPage: body.itemsPerPage as number | undefined,
      smtpHost: body.smtpHost as string | undefined,
      smtpPort: body.smtpPort as number | undefined,
      smtpSecure: body.smtpSecure as boolean | undefined,
      smtpUser: body.smtpUser as string | undefined,
      smtpPassword: body.smtpPassword as string | undefined,
      smtpFrom: body.smtpFrom as string | undefined,
      smtpFromName: body.smtpFromName as string | undefined,
    });
    await writeAudit({
      companyId: isPlatform ? null : companyId,
      userId,
      action: 'settings.update',
      resource: `settings:${scope}`,
      ip: getClientIp(request),
    });
    return jsonResponse({ settings });
  } catch (error) {
    console.error('Update settings error:', error);
    return errorResponse('Unable to save settings', 500);
  }
}
