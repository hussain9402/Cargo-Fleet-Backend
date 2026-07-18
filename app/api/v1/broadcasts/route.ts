import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse, optionsResponse, parseJsonBody } from '@/app/lib/auth/response';
import { requirePermission } from '@/app/lib/rbac/guard';
import { getClientIp, writeAudit } from '@/app/lib/rbac/audit';
import { PLATFORM_SCOPE, createBroadcast, listBroadcasts } from '@/app/lib/admin/admin';

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
  if (!scope) return jsonResponse({ broadcasts: [] });

  const broadcasts = await listBroadcasts(scope);
  return jsonResponse({ broadcasts });
}

export async function POST(request: NextRequest) {
  const guard = await requirePermission(request, 'settings:manage');
  if (!guard.ok) return guard.response;

  const { isPlatform, companyId, userId } = guard.context;
  const scope = scopeFor(isPlatform, companyId);
  if (!scope) return errorResponse('No scope for broadcast', 400);

  const body = await parseJsonBody<{ title?: string; body?: string; audience?: string }>(request);
  if (!body?.title || !body?.body) return errorResponse('Title and message are required');

  try {
    const id = await createBroadcast({
      scope,
      title: body.title,
      body: body.body,
      audience: body.audience,
      createdBy: userId,
    });
    await writeAudit({
      companyId: isPlatform ? null : companyId,
      userId,
      action: 'broadcast.create',
      resource: `broadcast:${id}`,
      ip: getClientIp(request),
    });
    return jsonResponse({ id }, 201);
  } catch (error) {
    console.error('Create broadcast error:', error);
    return errorResponse('Unable to send broadcast', 500);
  }
}
