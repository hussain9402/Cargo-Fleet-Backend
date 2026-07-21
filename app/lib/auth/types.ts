import type { UserRole } from '../rbac/permissions';

export type { UserRole };

export type Company = {
  id: string;
  name: string;
  status: 'active' | 'suspended';
  /** Public URL path, e.g. /uploads/companies/{id}/logo.png */
  logoUrl: string | null;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  /** Active / primary role for the current session */
  role: UserRole | null;
  /** All roles assigned to this user */
  roles: UserRole[];
  /**
   * Effective permissions for this user in their tenant
   * (defaults + role overrides + enabled flags). Clients should gate UI with this.
   */
  permissions: string[];
  /** Tenant the user belongs to (null for platform-level roles like super_admin) */
  companyId: string | null;
  company: Company | null;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthResponse = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

export type DbUser = {
  id: string;
  name: string;
  email: string;
  password: string | null;
  google_id: string | null;
  company_id: string | null;
  status: 'active' | 'suspended';
  created_at: Date;
  updated_at: Date;
};

/** A user as shown in admin management lists. */
export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'suspended';
  companyId: string | null;
  companyName: string | null;
  role: UserRole | null;
  roles: UserRole[];
  createdAt: Date;
};

export type DbUserRole = {
  id: string;
  user_id: string;
  role: UserRole;
  is_primary: number;
  created_at: Date;
};

export type DbCompany = {
  id: string;
  name: string;
  status: 'active' | 'suspended';
  logo_url: string | null;
  created_at: Date;
  updated_at: Date;
};
