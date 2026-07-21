import { query, queryOne } from '../db';
import {
  ALL_PERMISSIONS,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  isRole,
  type Permission,
  type UserRole,
} from './permissions';

export const PLATFORM_ROLE_SCOPE = 'platform';

type DbOverride = {
  scope: string;
  role: string;
  label: string | null;
  description: string | null;
  permissions: string | Permission[];
  enabled?: number | boolean;
};

let ensured = false;

export async function ensureRoleOverrideTable() {
  if (ensured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS role_overrides (
      scope VARCHAR(64) NOT NULL,
      role VARCHAR(40) NOT NULL,
      label VARCHAR(120) NULL,
      description VARCHAR(255) NULL,
      permissions JSON NOT NULL,
      enabled TINYINT(1) NOT NULL DEFAULT 1,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (scope, role)
    )
  `);
  try {
    await query(
      `ALTER TABLE role_overrides ADD COLUMN enabled TINYINT(1) NOT NULL DEFAULT 1`,
    );
  } catch {
    // column already exists
  }
  ensured = true;
}

function parsePermissions(raw: unknown): Permission[] {
  try {
    const arr = typeof raw === 'string' ? (JSON.parse(raw) as unknown) : raw;
    if (!Array.isArray(arr)) return [];
    const allowed = new Set<string>(ALL_PERMISSIONS);
    return arr.filter((p): p is Permission => typeof p === 'string' && allowed.has(p));
  } catch {
    return [];
  }
}

export type RoleOverride = {
  scope: string;
  role: UserRole;
  label: string | null;
  description: string | null;
  permissions: Permission[];
  enabled: boolean;
};

function mapOverride(row: DbOverride): RoleOverride | null {
  if (!isRole(row.role)) return null;
  return {
    scope: row.scope,
    role: row.role,
    label: row.label,
    description: row.description,
    permissions: parsePermissions(row.permissions),
    enabled: row.enabled === undefined || row.enabled === null ? true : !!row.enabled,
  };
}

export async function getRoleOverride(
  scope: string,
  role: UserRole,
): Promise<RoleOverride | null> {
  await ensureRoleOverrideTable();
  const row = await queryOne<DbOverride>(
    `SELECT scope, role, label, description, permissions, enabled FROM role_overrides WHERE scope = ? AND role = ?`,
    [scope, role],
  );
  if (!row) return null;
  return mapOverride(row);
}

export async function listRoleOverrides(scope: string): Promise<RoleOverride[]> {
  await ensureRoleOverrideTable();
  const rows = await query<DbOverride[]>(
    `SELECT scope, role, label, description, permissions, enabled FROM role_overrides WHERE scope = ?`,
    [scope],
  );
  return rows.map(mapOverride).filter((r): r is RoleOverride => !!r);
}

function pickOverride(
  companyMap: Map<UserRole, RoleOverride>,
  platformMap: Map<UserRole, RoleOverride>,
  role: UserRole,
): RoleOverride | null {
  return companyMap.get(role) ?? platformMap.get(role) ?? null;
}

/** Effective permissions for a role in a tenant scope (override or code default). */
export async function resolveRolePermissions(
  scope: string | null | undefined,
  role: UserRole,
): Promise<Permission[]> {
  if (role === 'super_admin') return ['*'];

  const companyMap = new Map<UserRole, RoleOverride>();
  const platformMap = new Map<UserRole, RoleOverride>();
  if (scope && scope !== PLATFORM_ROLE_SCOPE) {
    for (const ov of await listRoleOverrides(scope)) companyMap.set(ov.role, ov);
  }
  for (const ov of await listRoleOverrides(PLATFORM_ROLE_SCOPE)) platformMap.set(ov.role, ov);

  const ov = pickOverride(companyMap, platformMap, role);
  if (ov && !ov.enabled) return [];
  if (ov?.permissions.length) return ov.permissions;
  return [...ROLE_PERMISSIONS[role]];
}

/** Load overrides once, then resolve many roles cheaply. */
export async function resolvePermissionsForRoles(
  scope: string | null | undefined,
  roles: UserRole[],
): Promise<Permission[]> {
  if (roles.some((r) => r === 'super_admin')) return ['*'];
  if (!roles.length) return [];

  const companyMap = new Map<UserRole, RoleOverride>();
  const platformMap = new Map<UserRole, RoleOverride>();

  if (scope && scope !== PLATFORM_ROLE_SCOPE) {
    for (const ov of await listRoleOverrides(scope)) companyMap.set(ov.role, ov);
  }
  for (const ov of await listRoleOverrides(PLATFORM_ROLE_SCOPE)) platformMap.set(ov.role, ov);

  const set = new Set<Permission>();
  for (const role of roles) {
    const ov = pickOverride(companyMap, platformMap, role);
    if (ov && !ov.enabled) continue;
    const perms = ov?.permissions.length ? ov.permissions : ROLE_PERMISSIONS[role] ?? [];
    for (const p of perms) {
      if (p === '*') return ['*'];
      set.add(p);
    }
  }
  return [...set];
}

export async function rolesCan(
  scope: string | null | undefined,
  roles: UserRole[],
  permission: Permission,
): Promise<boolean> {
  const perms = await resolvePermissionsForRoles(scope, roles);
  return perms.includes('*') || perms.includes(permission);
}

export async function saveRoleOverride(input: {
  scope: string;
  role: UserRole;
  label?: string | null;
  description?: string | null;
  permissions: Permission[];
  enabled?: boolean;
}) {
  await ensureRoleOverrideTable();
  if (input.role === 'super_admin') {
    throw new Error('Super Admin permissions cannot be customized');
  }

  const allowed = new Set<string>(ALL_PERMISSIONS);
  const permissions = input.permissions.filter((p) => allowed.has(p));
  if (permissions.length === 0) {
    throw new Error('At least one permission is required');
  }

  const label = input.label?.trim() || null;
  const description = input.description?.trim() || null;
  const existing = await getRoleOverride(input.scope, input.role);
  const enabled =
    input.enabled !== undefined ? (input.enabled ? 1 : 0) : existing ? (existing.enabled ? 1 : 0) : 1;
  const json = JSON.stringify(permissions);

  await query(
    `INSERT INTO role_overrides (scope, role, label, description, permissions, enabled)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       label = VALUES(label),
       description = VALUES(description),
       permissions = VALUES(permissions),
       enabled = VALUES(enabled)`,
    [input.scope, input.role, label, description, json, enabled],
  );
}

export async function setRoleEnabled(scope: string, role: UserRole, enabled: boolean) {
  await ensureRoleOverrideTable();
  if (role === 'super_admin') {
    throw new Error('Super Admin cannot be disabled');
  }

  const existing = await getRoleOverride(scope, role);
  const permissions =
    existing?.permissions.length ? existing.permissions : [...ROLE_PERMISSIONS[role]].filter((p) => p !== '*');

  await saveRoleOverride({
    scope,
    role,
    label: existing?.label ?? null,
    description: existing?.description ?? null,
    permissions: permissions as Permission[],
    enabled,
  });
}

export async function resetRoleOverride(scope: string, role: UserRole) {
  await ensureRoleOverrideTable();
  await query(`DELETE FROM role_overrides WHERE scope = ? AND role = ?`, [scope, role]);
}

export function defaultRoleLabel(role: UserRole) {
  return ROLE_LABELS[role];
}

/** Whether a role is enabled for assignment / access in this scope. */
export async function isRoleEnabled(scope: string | null | undefined, role: UserRole): Promise<boolean> {
  if (role === 'super_admin') return true;
  if (!scope) return true;
  if (scope !== PLATFORM_ROLE_SCOPE) {
    const companyOv = await getRoleOverride(scope, role);
    if (companyOv) return companyOv.enabled;
  }
  const platformOv = await getRoleOverride(PLATFORM_ROLE_SCOPE, role);
  if (platformOv) return platformOv.enabled;
  return true;
}
