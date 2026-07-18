/**
 * Role-Based Access Control (RBAC) — single source of truth.
 *
 * Implements the role hierarchy and permission matrix described in project.md.
 * The mobile app mirrors this file at mobile_app/src/config/permissions.ts —
 * keep the two in sync.
 */

export const ROLES = [
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
] as const;

export type UserRole = (typeof ROLES)[number];

/** Roles that operate above any single company (platform level). */
export const PLATFORM_ROLES: UserRole[] = ['super_admin'];

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  company_owner: 'Company Owner',
  fleet_manager: 'Fleet Manager',
  dispatcher: 'Dispatcher',
  driver_manager: 'Driver Manager',
  maintenance_manager: 'Maintenance Manager',
  finance_manager: 'Finance Manager',
  customer_support: 'Customer Support',
  driver: 'Driver',
  customer: 'Customer',
};

/**
 * Permissions are `module:action` strings. `*` (only granted to super_admin)
 * means "everything".
 */
export type Permission =
  | '*'
  | 'dashboard:view'
  | 'company:view'
  | 'company:manage'
  | 'users:view'
  | 'users:manage'
  | 'vehicles:view'
  | 'vehicles:manage'
  | 'vehicles:maintenance'
  | 'drivers:view'
  | 'drivers:manage'
  | 'trips:view'
  | 'trips:manage'
  | 'trips:drive'
  | 'tracking:view'
  | 'tracking:own'
  | 'fuel:view'
  | 'fuel:manage'
  | 'fuel:submit'
  | 'maintenance:view'
  | 'maintenance:manage'
  | 'maintenance:report'
  | 'reports:fleet'
  | 'reports:driver'
  | 'reports:maintenance'
  | 'reports:finance'
  | 'ai:view'
  | 'billing:view'
  | 'billing:manage'
  | 'tickets:manage'
  | 'shipments:track'
  | 'notifications:view'
  | 'settings:manage'
  | 'settings:profile';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: ['*'],

  company_owner: [
    'dashboard:view',
    'company:view',
    'company:manage',
    'users:view',
    'users:manage',
    'vehicles:view',
    'vehicles:manage',
    'drivers:view',
    'drivers:manage',
    'trips:view',
    'trips:manage',
    'tracking:view',
    'fuel:view',
    'fuel:manage',
    'maintenance:view',
    'maintenance:manage',
    'reports:fleet',
    'reports:driver',
    'reports:maintenance',
    'reports:finance',
    'ai:view',
    'billing:view',
    'billing:manage',
    'tickets:manage',
    'shipments:track',
    'notifications:view',
    'settings:manage',
    'settings:profile',
  ],

  fleet_manager: [
    'dashboard:view',
    'vehicles:view',
    'vehicles:manage',
    'drivers:view',
    'trips:view',
    'trips:manage',
    'tracking:view',
    'fuel:view',
    'fuel:manage',
    'maintenance:view',
    'reports:fleet',
    'ai:view',
    'notifications:view',
    'settings:profile',
  ],

  dispatcher: [
    'dashboard:view',
    'trips:view',
    'trips:manage',
    'drivers:view',
    'vehicles:view',
    'tracking:view',
    'ai:view',
    'notifications:view',
    'settings:profile',
  ],

  driver_manager: [
    'dashboard:view',
    'drivers:view',
    'drivers:manage',
    'vehicles:view',
    'trips:view',
    'tracking:view',
    'reports:driver',
    'ai:view',
    'notifications:view',
    'settings:profile',
  ],

  maintenance_manager: [
    'dashboard:view',
    'maintenance:view',
    'maintenance:manage',
    'vehicles:view',
    'vehicles:maintenance',
    'fuel:view',
    'reports:maintenance',
    'ai:view',
    'notifications:view',
    'settings:profile',
  ],

  finance_manager: [
    'dashboard:view',
    'billing:view',
    'billing:manage',
    'reports:finance',
    'fuel:view',
    'trips:view',
    'vehicles:view',
    'ai:view',
    'notifications:view',
    'settings:profile',
  ],

  customer_support: [
    'dashboard:view',
    'tickets:manage',
    'trips:view',
    'tracking:view',
    'shipments:track',
    'notifications:view',
    'settings:profile',
  ],

  driver: [
    'dashboard:view',
    'trips:view',
    'trips:drive',
    'tracking:own',
    'vehicles:view',
    'fuel:submit',
    'maintenance:report',
    'ai:view',
    'notifications:view',
    'settings:profile',
  ],

  customer: [
    'dashboard:view',
    'shipments:track',
    'tracking:own',
    'billing:view',
    'notifications:view',
    'settings:profile',
  ],
};

export function isRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export function isPlatformRole(role: UserRole | null | undefined) {
  return !!role && PLATFORM_ROLES.includes(role);
}

/** Does a single role grant the given permission? */
export function roleCan(role: UserRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return perms.includes('*') || perms.includes(permission);
}

/** Does any of the user's roles grant the given permission? */
export function can(roles: UserRole[] | null | undefined, permission: Permission): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some((role) => roleCan(role, permission));
}

/** Convenience: does the user hold at least one of the required permissions? */
export function canAny(roles: UserRole[] | null | undefined, permissions: Permission[]): boolean {
  return permissions.some((permission) => can(roles, permission));
}
