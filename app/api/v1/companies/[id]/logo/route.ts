import { NextRequest } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { errorResponse, jsonResponse, optionsResponse } from '@/app/lib/auth/response';
import { requirePermission } from '@/app/lib/rbac/guard';
import { getClientIp, writeAudit } from '@/app/lib/rbac/audit';
import { findCompanyById, updateCompany } from '@/app/lib/auth/users';

export async function OPTIONS() {
  return optionsResponse();
}

const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);
const MAX_BYTES = 2 * 1024 * 1024; // 2MB

/**
 * Upload company logo. Stored under /public/uploads/companies/{id}/logo.{ext}
 * and saved as logo_url on the company row.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission(request, 'company:manage');
  if (!guard.ok) return guard.response;

  const { isPlatform, companyId, userId } = guard.context;
  const { id } = await params;
  if (!isPlatform && id !== companyId) return errorResponse('Forbidden', 403);

  const company = await findCompanyById(id);
  if (!company) return errorResponse('Company not found', 404);

  try {
    const form = await request.formData();
    const file = form.get('logo');
    if (!file || !(file instanceof File)) {
      return errorResponse('logo file is required');
    }
    if (!ALLOWED.has(file.type)) {
      return errorResponse('Logo must be PNG, JPEG, WebP, or SVG');
    }
    if (file.size > MAX_BYTES) {
      return errorResponse('Logo must be under 2MB');
    }

    const ext =
      file.type === 'image/png'
        ? '.png'
        : file.type === 'image/jpeg'
          ? '.jpg'
          : file.type === 'image/webp'
            ? '.webp'
            : '.svg';

    const dir = path.join(process.cwd(), 'public', 'uploads', 'companies', id);
    await mkdir(dir, { recursive: true });
    const filename = `logo${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), buffer);

    const logoUrl = `/uploads/companies/${id}/${filename}?v=${Date.now()}`;
    const updated = await updateCompany(id, { logoUrl });

    await writeAudit({
      companyId: id,
      userId,
      action: 'company.logo_upload',
      resource: `company:${id}`,
      ip: getClientIp(request),
      detail: { logoUrl },
    });

    return jsonResponse({ company: updated });
  } catch (error) {
    console.error('Logo upload error:', error);
    return errorResponse('Unable to upload logo', 500);
  }
}
