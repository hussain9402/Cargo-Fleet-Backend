import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse, optionsResponse, parseJsonBody } from '@/app/lib/auth/response';
import { requirePermission } from '@/app/lib/rbac/guard';
import { getClientIp, writeAudit } from '@/app/lib/rbac/audit';
import {
  ALL_PERMISSIONS,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  isRole,
  type Permission,
  type UserRole,
} from '@/app/lib/rbac/permissions';
import {
  PLATFORM_ROLE_SCOPE,
  listRoleOverrides,
  resetRoleOverride,
  saveRoleOverride,
  setRoleEnabled,
} from '@/app/lib/rbac/roleOverrides';
import { listManagedUsers } from '@/app/lib/auth/users';

export async function OPTIONS() {
  return optionsResponse();
}

function scopeFor(isPlatform: boolean, companyId: string | null) {
  return isPlatform ? PLATFORM_ROLE_SCOPE : companyId;
}

const ROLE_DESC: Record<UserRole, string> = {
  super_admin: 'Full control across the entire platform',
  company_owner: 'Owns and manages the whole company',
  fleet_manager: 'Manages vehicles, drivers and trips',
  dispatcher: 'Assigns routes and tracks trips',
  driver_manager: 'Oversees drivers and performance',
  maintenance_manager: 'Handles vehicle servicing & repairs',
  finance_manager: 'Billing, invoices and finance reports',
  customer_support: 'Handles tickets and customer queries',
  driver: 'Drives trips and reports status',
  customer: 'Tracks shipments and invoices',
};

export async function GET(request: NextRequest) {
  const guard = await requirePermission(request, 'users:view');
  if (!guard.ok) return guard.response;

  const { isPlatform, companyId } = guard.context;
  const scope = scopeFor(isPlatform, companyId);
  if (!scope) return jsonResponse({ roles: [], catalog: ALL_PERMISSIONS });

  const users = await listManagedUsers(isPlatform ? null : companyId);
  const counts: Record<string, number> = {};
  for (const u of users) {
    if (u.role) counts[u.role] = (counts[u.role] ?? 0) + 1;
  }

  const overrides = await listRoleOverrides(scope);
  const overrideMap = new Map(overrides.map((o) => [o.role, o]));

  const platformOverrides =
    scope !== PLATFORM_ROLE_SCOPE ? await listRoleOverrides(PLATFORM_ROLE_SCOPE) : [];
  const platformMap = new Map(platformOverrides.map((o) => [o.role, o]));

  const roles = (ROLES_VISIBLE(isPlatform) as UserRole[]).map((role) => {
    const ov = overrideMap.get(role);
    const platformOv = platformMap.get(role);
    const defaults = [...ROLE_PERMISSIONS[role]];
    const effective = ov ?? platformOv;
    const permissions =
      role === 'super_admin' ? (['*'] as Permission[]) : effective?.permissions?.length
        ? effective.permissions
        : defaults;
    const enabled = role === 'super_admin' ? true : effective ? effective.enabled : true;
    return {
      role,
      label: effective?.label || ROLE_LABELS[role],
      description: effective?.description || ROLE_DESC[role],
      defaultLabel: ROLE_LABELS[role],
      defaultDescription: ROLE_DESC[role],
      permissions,
      defaults,
      enabled,
      isCustomized: !!ov,
      inheritedFromPlatform: !ov && !!platformOv,
      editable: role !== 'super_admin',
      userCount: counts[role] ?? 0,
    };
  });

  return jsonResponse({ roles, catalog: ALL_PERMISSIONS });
}

function ROLES_VISIBLE(isPlatform: boolean): UserRole[] {
  const all: UserRole[] = [
    'super_admin',
    'company_owner',
    'fleet_manager',
    'dispatcher',
    'driver_manager',
    'maintenance_manager',
    'finance_manager',
    'customer_support',
    'driver',
    'customer',
  ];
  return isPlatform ? all : all.filter((r) => r !== 'super_admin');
}

export async function PATCH(request: NextRequest) {
  const guard = await requirePermission(request, 'users:manage');
  if (!guard.ok) return guard.response;

  const { isPlatform, companyId, userId } = guard.context;
  const scope = scopeFor(isPlatform, companyId);
  if (!scope) return errorResponse('No scope for role overrides', 400);

  const body = await parseJsonBody<{
    role?: string;
    label?: string | null;
    description?: string | null;
    permissions?: string[];
    enabled?: boolean;
    reset?: boolean;
  }>(request);

  if (!body?.role || !isRole(body.role)) return errorResponse('Valid role is required');
  if (body.role === 'super_admin') return errorResponse('Super Admin cannot be customized', 400);

  try {
    if (body.reset) {
      await resetRoleOverride(scope, body.role);
      await writeAudit({
        companyId: isPlatform ? null : companyId,
        userId,
        action: 'role.reset',
        resource: `role:${body.role}`,
        ip: getClientIp(request),
      });
      return jsonResponse({ ok: true, reset: true });
    }

    // Toggle-only update
    if (typeof body.enabled === 'boolean' && !Array.isArray(body.permissions) && body.label === undefined) {
      await setRoleEnabled(scope, body.role, body.enabled);
      await writeAudit({
        companyId: isPlatform ? null : companyId,
        userId,
        action: body.enabled ? 'role.enable' : 'role.disable',
        resource: `role:${body.role}`,
        ip: getClientIp(request),
      });
      return jsonResponse({ ok: true, enabled: body.enabled });
    }

    if (!Array.isArray(body.permissions)) return errorResponse('permissions array is required');

    const allowed = new Set<string>(ALL_PERMISSIONS);
    const permissions = body.permissions.filter((p): p is Permission => allowed.has(p));
    if (permissions.length === 0) return errorResponse('Select at least one permission');

    await saveRoleOverride({
      scope,
      role: body.role,
      label: body.label,
      description: body.description,
      permissions,
      enabled: body.enabled,
    });

    await writeAudit({
      companyId: isPlatform ? null : companyId,
      userId,
      action: 'role.update',
      resource: `role:${body.role}`,
      ip: getClientIp(request),
    });

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error('Role update error:', error);
    return errorResponse(error instanceof Error ? error.message : 'Unable to update role', 500);
  }
}
