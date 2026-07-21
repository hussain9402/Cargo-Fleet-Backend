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

/** Every concrete permission (excludes `*`). Used by the roles editor. */
export const ALL_PERMISSIONS: Exclude<Permission, '*'>[] = [
  'dashboard:view',
  'company:view',
  'company:manage',
  'users:view',
  'users:manage',
  'vehicles:view',
  'vehicles:manage',
  'vehicles:maintenance',
  'drivers:view',
  'drivers:manage',
  'trips:view',
  'trips:manage',
  'trips:drive',
  'tracking:view',
  'tracking:own',
  'fuel:view',
  'fuel:manage',
  'fuel:submit',
  'maintenance:view',
  'maintenance:manage',
  'maintenance:report',
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
];

export const PERMISSION_META: Record<
  Exclude<Permission, '*'>,
  { module: string; action: string; label: string }
> = {
  'dashboard:view': { module: 'Dashboard', action: 'view', label: 'View dashboard' },
  'company:view': { module: 'Company', action: 'view', label: 'View company' },
  'company:manage': { module: 'Company', action: 'manage', label: 'Manage company' },
  'users:view': { module: 'Users', action: 'view', label: 'View users' },
  'users:manage': { module: 'Users', action: 'manage', label: 'Manage users' },
  'vehicles:view': { module: 'Vehicles', action: 'view', label: 'View vehicles' },
  'vehicles:manage': { module: 'Vehicles', action: 'manage', label: 'Manage vehicles' },
  'vehicles:maintenance': { module: 'Vehicles', action: 'maintenance', label: 'Vehicle maintenance' },
  'drivers:view': { module: 'Drivers', action: 'view', label: 'View drivers' },
  'drivers:manage': { module: 'Drivers', action: 'manage', label: 'Manage drivers' },
  'trips:view': { module: 'Trips', action: 'view', label: 'View trips' },
  'trips:manage': { module: 'Trips', action: 'manage', label: 'Manage trips (add / edit / delete)' },
  'trips:drive': { module: 'Trips', action: 'drive', label: 'Drive trips' },
  'tracking:view': { module: 'Tracking', action: 'view', label: 'Live tracking' },
  'tracking:own': { module: 'Tracking', action: 'own', label: 'Own tracking only' },
  'fuel:view': { module: 'Fuel', action: 'view', label: 'View fuel' },
  'fuel:manage': { module: 'Fuel', action: 'manage', label: 'Manage fuel' },
  'fuel:submit': { module: 'Fuel', action: 'submit', label: 'Submit fuel logs' },
  'maintenance:view': { module: 'Maintenance', action: 'view', label: 'View maintenance' },
  'maintenance:manage': { module: 'Maintenance', action: 'manage', label: 'Manage maintenance' },
  'maintenance:report': { module: 'Maintenance', action: 'report', label: 'Report issues' },
  'reports:fleet': { module: 'Reports', action: 'fleet', label: 'Fleet reports' },
  'reports:driver': { module: 'Reports', action: 'driver', label: 'Driver reports' },
  'reports:maintenance': { module: 'Reports', action: 'maintenance', label: 'Maintenance reports' },
  'reports:finance': { module: 'Reports', action: 'finance', label: 'Finance reports' },
  'ai:view': { module: 'AI', action: 'view', label: 'AI insights' },
  'billing:view': { module: 'Billing', action: 'view', label: 'View billing' },
  'billing:manage': { module: 'Billing', action: 'manage', label: 'Manage billing' },
  'tickets:manage': { module: 'Support', action: 'manage', label: 'Manage tickets' },
  'shipments:track': { module: 'Shipments', action: 'track', label: 'Track shipments' },
  'notifications:view': { module: 'Notifications', action: 'view', label: 'View notifications' },
  'settings:manage': { module: 'Settings', action: 'manage', label: 'Manage settings' },
  'settings:profile': { module: 'Settings', action: 'profile', label: 'Edit own profile' },
};

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

  // Drivers only see their own trips / vehicle (enforced server-side via user_id link).
  driver: [
    'dashboard:view',
    'trips:drive',
    'tracking:own',
    'fuel:submit',
    'maintenance:report',
    'ai:view',
    'notifications:view',
    'settings:profile',
  ],

  // Customers only see their own shipments (customer_user_id on trips).
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

/**
 * True when the user may see the whole company fleet (not just own rows).
 * Drivers / customers with only *:own / drive / track get scoped lists.
 */
export function hasCompanyWideFleetAccess(roles: UserRole[] | null | undefined): boolean {
  return canAny(roles, [
    'trips:manage',
    'trips:view',
    'tracking:view',
    'vehicles:manage',
    'drivers:view',
    'company:manage',
  ]);
}
