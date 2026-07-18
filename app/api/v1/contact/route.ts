import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse, optionsResponse, parseJsonBody } from '@/app/lib/auth/response';
import { requirePermission } from '@/app/lib/rbac/guard';
import { getClientIp, writeAudit } from '@/app/lib/rbac/audit';
import { createContactMessage, listContactMessages } from '@/app/lib/admin/admin';

export async function OPTIONS() {
  return optionsResponse();
}

// Super admin sees every message (inbox); a company sees only the messages it sent.
export async function GET(request: NextRequest) {
  const guard = await requirePermission(request, 'settings:manage');
  if (!guard.ok) return guard.response;

  const { isPlatform, companyId } = guard.context;
  const messages = await listContactMessages(isPlatform ? null : companyId);
  return jsonResponse({ messages });
}

// A company admin sends a message to the platform team.
export async function POST(request: NextRequest) {
  const guard = await requirePermission(request, 'settings:manage');
  if (!guard.ok) return guard.response;

  const { isPlatform, companyId, userId, email } = guard.context;

  const body = await parseJsonBody<{ subject?: string; message?: string; name?: string; email?: string }>(
    request,
  );
  if (!body?.subject || !body?.message) return errorResponse('Subject and message are required');

  try {
    const id = await createContactMessage({
      companyId: isPlatform ? null : companyId,
      userId,
      name: body.name ?? email,
      email: body.email ?? email,
      subject: body.subject,
      message: body.message,
    });
    await writeAudit({
      companyId: isPlatform ? null : companyId,
      userId,
      action: 'contact.create',
      resource: `contact:${id}`,
      ip: getClientIp(request),
    });
    return jsonResponse({ id }, 201);
  } catch (error) {
    console.error('Create contact message error:', error);
    return errorResponse('Unable to send message', 500);
  }
}
