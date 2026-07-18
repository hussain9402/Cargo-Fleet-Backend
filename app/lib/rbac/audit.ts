import { NextRequest } from 'next/server';
import { generateId, query } from '../db';

export function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? null;
  return request.headers.get('x-real-ip');
}

/**
 * Record a sensitive action in the audit log. Best-effort: failures are
 * swallowed so auditing can never break the primary request.
 */
export async function writeAudit(input: {
  companyId: string | null;
  userId: string | null;
  action: string;
  resource?: string | null;
  ip?: string | null;
  detail?: unknown;
}) {
  try {
    const detail =
      input.detail === undefined
        ? null
        : typeof input.detail === 'string'
          ? input.detail
          : JSON.stringify(input.detail);

    await query(
      `INSERT INTO audit_logs (id, company_id, user_id, action, resource, ip, detail)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        generateId(),
        input.companyId,
        input.userId,
        input.action,
        input.resource ?? null,
        input.ip ?? null,
        detail,
      ],
    );
  } catch (error) {
    console.error('Audit log write failed:', error);
  }
}
