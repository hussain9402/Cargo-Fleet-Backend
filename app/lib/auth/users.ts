import bcrypt from 'bcrypt';
import { generateId, query, queryOne } from '../db';
import {
  createRefreshToken,
  getRefreshExpiryDate,
  hashToken,
  signAccessToken,
} from './jwt';
import { sendPasswordResetEmail } from './mail';
import { verifyGoogleIdToken } from './google';
import { isPlatformRole, type UserRole } from '../rbac/permissions';
import type {
  AuthResponse,
  AuthUser,
  Company,
  DbCompany,
  DbUser,
  DbUserRole,
  ManagedUser,
} from './types';

const USER_COLUMNS =
  'id, name, email, password, google_id, company_id, status, created_at, updated_at';

/* ------------------------------------------------------------------ */
/* Companies (multi-tenant)                                            */
/* ------------------------------------------------------------------ */

export async function findCompanyById(id: string): Promise<Company | null> {
  const row = await queryOne<DbCompany>(
    `SELECT id, name, status, created_at, updated_at FROM companies WHERE id = ? LIMIT 1`,
    [id],
  );
  if (!row) return null;
  return { id: row.id, name: row.name, status: row.status };
}

export async function listCompanies(): Promise<Company[]> {
  const rows = await query<DbCompany[]>(
    `SELECT id, name, status, created_at, updated_at FROM companies ORDER BY created_at DESC`,
  );
  return rows.map((row) => ({ id: row.id, name: row.name, status: row.status }));
}

export async function createCompany(name: string): Promise<Company> {
  const id = generateId();
  await query(`INSERT INTO companies (id, name, status) VALUES (?, ?, 'active')`, [id, name]);
  return { id, name, status: 'active' };
}

export async function updateCompany(
  id: string,
  patch: { name?: string; status?: 'active' | 'suspended' },
): Promise<Company | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  if (patch.name !== undefined) {
    sets.push('name = ?');
    params.push(patch.name);
  }
  if (patch.status !== undefined) {
    sets.push('status = ?');
    params.push(patch.status);
  }
  if (sets.length === 0) return findCompanyById(id);

  params.push(id);
  await query(`UPDATE companies SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`, params);
  return findCompanyById(id);
}

export async function deleteCompany(id: string) {
  await query(`DELETE FROM companies WHERE id = ?`, [id]);
}

/* ------------------------------------------------------------------ */
/* Roles                                                               */
/* ------------------------------------------------------------------ */

export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const rows = await query<DbUserRole[]>(
    `SELECT role FROM user_roles WHERE user_id = ? ORDER BY is_primary DESC, created_at ASC`,
    [userId],
  );
  return rows.map((row) => row.role);
}

export async function getPrimaryUserRole(userId: string): Promise<UserRole | null> {
  const row = await queryOne<DbUserRole>(
    `SELECT role FROM user_roles WHERE user_id = ? AND is_primary = 1 LIMIT 1`,
    [userId],
  );
  if (row) return row.role;

  const fallback = await queryOne<DbUserRole>(
    `SELECT role FROM user_roles WHERE user_id = ? ORDER BY created_at ASC LIMIT 1`,
    [userId],
  );
  return fallback?.role ?? null;
}

export async function toAuthUser(user: DbUser): Promise<AuthUser> {
  const roles = await getUserRoles(user.id);
  const role = await getPrimaryUserRole(user.id);
  const company = user.company_id ? await findCompanyById(user.company_id) : null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role,
    roles,
    companyId: user.company_id,
    company,
  };
}

/* ------------------------------------------------------------------ */
/* User lookups                                                        */
/* ------------------------------------------------------------------ */

export async function findUserByEmail(email: string) {
  return queryOne<DbUser>(
    `SELECT ${USER_COLUMNS} FROM users WHERE email = ? LIMIT 1`,
    [email.toLowerCase()],
  );
}

export async function findUserById(id: string) {
  return queryOne<DbUser>(`SELECT ${USER_COLUMNS} FROM users WHERE id = ? LIMIT 1`, [id]);
}

export async function findUserByGoogleId(googleId: string) {
  return queryOne<DbUser>(
    `SELECT ${USER_COLUMNS} FROM users WHERE google_id = ? LIMIT 1`,
    [googleId],
  );
}

/* ------------------------------------------------------------------ */
/* Sessions                                                            */
/* ------------------------------------------------------------------ */

async function storeRefreshToken(userId: string, refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  const expiresAt = getRefreshExpiryDate();

  await query(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`,
    [generateId(), userId, tokenHash, expiresAt],
  );
}

export async function createAuthSession(user: DbUser): Promise<AuthResponse> {
  const authUser = await toAuthUser(user);
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: authUser.role,
    companyId: authUser.companyId,
  });
  const refreshToken = createRefreshToken();
  await storeRefreshToken(user.id, refreshToken);

  return { user: authUser, accessToken, refreshToken };
}

/* ------------------------------------------------------------------ */
/* Registration / login                                                */
/* ------------------------------------------------------------------ */

export async function registerUser(input: {
  email: string;
  password: string;
  fullName: string;
  companyName?: string;
  companyId?: string;
  role?: UserRole;
}) {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new Error('EMAIL_EXISTS');
  }

  // Resolve tenant + initial role.
  let companyId: string | null = null;
  let initialRole: UserRole;

  if (input.companyId) {
    const company = await findCompanyById(input.companyId);
    if (!company) throw new Error('COMPANY_NOT_FOUND');
    companyId = company.id;
    initialRole = input.role ?? 'driver';
  } else {
    // No existing company → create one and make this user its owner.
    const company = await createCompany(input.companyName?.trim() || `${input.fullName}'s Company`);
    companyId = company.id;
    initialRole = input.role ?? 'company_owner';
  }

  const id = generateId();
  const passwordHash = await bcrypt.hash(input.password, 10);

  await query(`INSERT INTO users (id, name, email, password, company_id) VALUES (?, ?, ?, ?, ?)`, [
    id,
    input.fullName,
    input.email.toLowerCase(),
    passwordHash,
    companyId,
  ]);

  await assignUserRole(id, initialRole, true);

  const user = await findUserById(id);
  if (!user) {
    throw new Error('USER_CREATE_FAILED');
  }

  return createAuthSession(user);
}

export async function loginUser(input: { email: string; password: string }) {
  const user = await findUserByEmail(input.email);
  if (!user?.password) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const valid = await bcrypt.compare(input.password, user.password);
  if (!valid) {
    throw new Error('INVALID_CREDENTIALS');
  }

  if (user.status === 'suspended') {
    throw new Error('ACCOUNT_LOCKED');
  }

  return createAuthSession(user);
}

export async function loginWithGoogle(idToken: string) {
  const profile = await verifyGoogleIdToken(idToken);

  let user = await findUserByGoogleId(profile.googleId);

  if (!user) {
    const existingByEmail = await findUserByEmail(profile.email);
    if (existingByEmail) {
      await query(`UPDATE users SET google_id = ?, updated_at = NOW() WHERE id = ?`, [
        profile.googleId,
        existingByEmail.id,
      ]);
      user = await findUserById(existingByEmail.id);
    } else {
      // New Google user → provision a company + owner (they can switch role later).
      const company = await createCompany(`${profile.name}'s Company`);
      const id = generateId();
      await query(
        `INSERT INTO users (id, name, email, google_id, company_id) VALUES (?, ?, ?, ?, ?)`,
        [id, profile.name, profile.email, profile.googleId, company.id],
      );
      await assignUserRole(id, 'company_owner', true);
      user = await findUserById(id);
    }
  }

  if (!user) {
    throw new Error('GOOGLE_LOGIN_FAILED');
  }

  return createAuthSession(user);
}

export async function refreshAuthSession(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  const session = await queryOne<{ user_id: string }>(
    `SELECT user_id FROM refresh_tokens
     WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > NOW()
     LIMIT 1`,
    [tokenHash],
  );

  if (!session) {
    throw new Error('INVALID_REFRESH_TOKEN');
  }

  await query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ?`, [tokenHash]);

  const user = await findUserById(session.user_id);
  if (!user) {
    throw new Error('INVALID_REFRESH_TOKEN');
  }

  return createAuthSession(user);
}

export async function revokeRefreshToken(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  await query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ? AND revoked_at IS NULL`,
    [tokenHash],
  );
}

/* ------------------------------------------------------------------ */
/* Role assignment                                                     */
/* ------------------------------------------------------------------ */

/** Assign a role to a user (keeps existing roles; sets this one as primary). */
export async function assignUserRole(userId: string, role: UserRole, setPrimary = true) {
  const existing = await queryOne<DbUserRole>(
    `SELECT id FROM user_roles WHERE user_id = ? AND role = ? LIMIT 1`,
    [userId, role],
  );

  if (setPrimary) {
    await query(`UPDATE user_roles SET is_primary = 0 WHERE user_id = ?`, [userId]);
  }

  if (!existing) {
    await query(
      `INSERT INTO user_roles (id, user_id, role, is_primary) VALUES (?, ?, ?, ?)`,
      [generateId(), userId, role, setPrimary ? 1 : 0],
    );
  } else if (setPrimary) {
    await query(`UPDATE user_roles SET is_primary = 1 WHERE user_id = ? AND role = ?`, [
      userId,
      role,
    ]);
  }

  const user = await findUserById(userId);
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  return await toAuthUser(user);
}

export async function updateUserRole(userId: string, role: UserRole) {
  return assignUserRole(userId, role, true);
}

/* ------------------------------------------------------------------ */
/* User management (admin panels)                                      */
/* ------------------------------------------------------------------ */

/** List users. Pass a companyId to scope to one tenant, or null for all (super admin). */
export async function listManagedUsers(companyId: string | null): Promise<ManagedUser[]> {
  const rows = companyId
    ? await query<DbUser[]>(
        `SELECT ${USER_COLUMNS} FROM users WHERE company_id = ? ORDER BY created_at DESC`,
        [companyId],
      )
    : await query<DbUser[]>(`SELECT ${USER_COLUMNS} FROM users ORDER BY created_at DESC`);

  const result: ManagedUser[] = [];
  for (const user of rows) {
    const roles = await getUserRoles(user.id);
    const role = await getPrimaryUserRole(user.id);
    const company = user.company_id ? await findCompanyById(user.company_id) : null;
    result.push({
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      companyId: user.company_id,
      companyName: company?.name ?? null,
      role,
      roles,
      createdAt: user.created_at,
    });
  }
  return result;
}

/** Create (invite) a user inside a company with a role. */
export async function createManagedUser(input: {
  companyId: string;
  email: string;
  fullName: string;
  password: string;
  role: UserRole;
}) {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new Error('EMAIL_EXISTS');
  }

  const id = generateId();
  const passwordHash = await bcrypt.hash(input.password, 10);
  await query(`INSERT INTO users (id, name, email, password, company_id) VALUES (?, ?, ?, ?, ?)`, [
    id,
    input.fullName,
    input.email.toLowerCase(),
    passwordHash,
    input.companyId,
  ]);
  await assignUserRole(id, input.role, true);
  return id;
}

/** Update a managed user's name and/or email (admin action). */
export async function updateManagedUserDetails(
  userId: string,
  patch: { name?: string; email?: string },
) {
  if (patch.email) {
    const existing = await findUserByEmail(patch.email);
    if (existing && existing.id !== userId) throw new Error('EMAIL_EXISTS');
    await query(`UPDATE users SET email = ?, updated_at = NOW() WHERE id = ?`, [
      patch.email.toLowerCase(),
      userId,
    ]);
  }
  if (patch.name !== undefined && patch.name.trim()) {
    await query(`UPDATE users SET name = ?, updated_at = NOW() WHERE id = ?`, [patch.name.trim(), userId]);
  }
}

export async function setUserStatus(userId: string, status: 'active' | 'suspended') {
  await query(`UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?`, [status, userId]);
}

export async function deleteUserById(userId: string) {
  await query(`DELETE FROM users WHERE id = ?`, [userId]);
}

export async function resetUserPassword(userId: string, newPassword: string) {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await query(`UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?`, [passwordHash, userId]);
}

/** Update the signed-in user's own name and/or password (verifies current password on change). */
export async function updateOwnProfile(
  userId: string,
  patch: { name?: string; currentPassword?: string; newPassword?: string },
) {
  const user = await findUserById(userId);
  if (!user) throw new Error('USER_NOT_FOUND');

  if (patch.newPassword) {
    if (!user.password || !patch.currentPassword) throw new Error('CURRENT_PASSWORD_REQUIRED');
    const valid = await bcrypt.compare(patch.currentPassword, user.password);
    if (!valid) throw new Error('INVALID_CURRENT_PASSWORD');
    const passwordHash = await bcrypt.hash(patch.newPassword, 10);
    await query(`UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?`, [passwordHash, userId]);
  }
  if (patch.name !== undefined && patch.name.trim()) {
    await query(`UPDATE users SET name = ?, updated_at = NOW() WHERE id = ?`, [patch.name.trim(), userId]);
  }
  return findUserById(userId);
}

export async function removeUserRole(userId: string, role: UserRole) {
  const wasPrimary = await queryOne<DbUserRole>(
    `SELECT id FROM user_roles WHERE user_id = ? AND role = ? AND is_primary = 1 LIMIT 1`,
    [userId, role],
  );

  await query(`DELETE FROM user_roles WHERE user_id = ? AND role = ?`, [userId, role]);

  if (wasPrimary) {
    const next = await queryOne<DbUserRole>(
      `SELECT role FROM user_roles WHERE user_id = ? ORDER BY created_at ASC LIMIT 1`,
      [userId],
    );
    if (next) {
      await query(`UPDATE user_roles SET is_primary = 0 WHERE user_id = ?`, [userId]);
      await query(`UPDATE user_roles SET is_primary = 1 WHERE user_id = ? AND role = ?`, [
        userId,
        next.role,
      ]);
    }
  }

  const user = await findUserById(userId);
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  return await toAuthUser(user);
}

async function migrateLegacyUserRoles() {
  const legacyUsers = await query<{ id: string; role: UserRole }[]>(
    `SELECT id, role FROM users WHERE role IS NOT NULL`,
  );

  for (const row of legacyUsers) {
    const exists = await queryOne<{ id: string }>(
      `SELECT id FROM user_roles WHERE user_id = ? AND role = ? LIMIT 1`,
      [row.id, row.role],
    );

    if (!exists) {
      await query(
        `INSERT INTO user_roles (id, user_id, role, is_primary) VALUES (?, ?, ?, 1)`,
        [generateId(), row.id, row.role],
      );
    }
  }
}

/* ------------------------------------------------------------------ */
/* Password reset                                                      */
/* ------------------------------------------------------------------ */

function generateResetCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function requestPasswordReset(email: string) {
  const user = await findUserByEmail(email);
  if (!user) {
    return { message: 'If that email exists, a reset code has been sent.' };
  }

  const code = generateResetCode();
  const tokenHash = hashToken(code);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await query(`UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL`, [
    user.id,
  ]);

  await query(
    `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`,
    [generateId(), user.id, tokenHash, expiresAt],
  );

  await sendPasswordResetEmail(user.email, code);

  return { message: 'If that email exists, a reset code has been sent.' };
}

export async function resetPassword(input: { email: string; code: string; password: string }) {
  const user = await findUserByEmail(input.email);
  if (!user) {
    throw new Error('INVALID_RESET_CODE');
  }

  const tokenHash = hashToken(input.code);
  const resetToken = await queryOne<{ id: string }>(
    `SELECT id FROM password_reset_tokens
     WHERE user_id = ? AND token_hash = ? AND used_at IS NULL AND expires_at > NOW()
     LIMIT 1`,
    [user.id, tokenHash],
  );

  if (!resetToken) {
    throw new Error('INVALID_RESET_CODE');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  await query(`UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?`, [
    passwordHash,
    user.id,
  ]);

  await query(`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?`, [resetToken.id]);

  return { message: 'Password updated successfully' };
}

/* ------------------------------------------------------------------ */
/* Schema / migrations                                                 */
/* ------------------------------------------------------------------ */

async function columnExists(table: string, column: string): Promise<boolean> {
  const row = await queryOne<{ count: number }>(
    `SELECT COUNT(*) AS count FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column],
  );
  return (row?.count ?? 0) > 0;
}

let authTablesReady = false;

export async function ensureAuthTables(force = false) {
  if (authTablesReady && !force) return;

  await query(`
    CREATE TABLE IF NOT EXISTS companies (
      id CHAR(36) PRIMARY KEY,
      name VARCHAR(191) NOT NULL,
      status ENUM('active', 'suspended') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id CHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NULL,
      role VARCHAR(40) NULL,
      google_id VARCHAR(255) NULL UNIQUE,
      company_id CHAR(36) NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // Migrate older installs: widen role column and add company_id/status.
  if (!(await columnExists('users', 'company_id'))) {
    await query(`ALTER TABLE users ADD COLUMN company_id CHAR(36) NULL`);
  }
  if (!(await columnExists('users', 'status'))) {
    await query(`ALTER TABLE users ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active'`);
  }

  // Older schema used ENUM('manager','dispatcher','driver') which truncates the
  // new 10-role values. Widen to VARCHAR so all roles fit.
  try {
    await query(`ALTER TABLE users MODIFY COLUMN role VARCHAR(40) NULL`);
  } catch (error) {
    console.error('users.role migration skipped:', error);
  }

  await query(`
    CREATE TABLE IF NOT EXISTS user_roles (
      id CHAR(36) PRIMARY KEY,
      user_id CHAR(36) NOT NULL,
      role VARCHAR(40) NOT NULL,
      is_primary TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_user_role (user_id, role),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Widen an older ENUM role column on user_roles to VARCHAR(40).
  try {
    await query(`ALTER TABLE user_roles MODIFY COLUMN role VARCHAR(40) NOT NULL`);
  } catch (error) {
    console.error('user_roles.role migration skipped:', error);
  }

  await migrateLegacyUserRoles();

  // Assign company-less, NON-platform users to a shared Default Company.
  // Platform roles (super_admin) intentionally stay company-less.
  const orphanCount = await queryOne<{ count: number }>(
    `SELECT COUNT(*) AS count FROM users
     WHERE company_id IS NULL
       AND id NOT IN (SELECT user_id FROM user_roles WHERE role = 'super_admin')`,
  );
  if ((orphanCount?.count ?? 0) > 0) {
    let fallback = await queryOne<DbCompany>(
      `SELECT id, name, status, created_at, updated_at FROM companies WHERE name = 'Default Company' LIMIT 1`,
    );
    if (!fallback) {
      const created = await createCompany('Default Company');
      fallback = { id: created.id } as DbCompany;
    }
    await query(
      `UPDATE users SET company_id = ?
       WHERE company_id IS NULL
         AND id NOT IN (SELECT user_id FROM user_roles WHERE role = 'super_admin')`,
      [fallback.id],
    );
  }

  // Correct any platform user that a prior migration tied to a company.
  await query(
    `UPDATE users SET company_id = NULL
     WHERE id IN (SELECT user_id FROM user_roles WHERE role = 'super_admin')`,
  );

  await query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id CHAR(36) PRIMARY KEY,
      user_id CHAR(36) NOT NULL,
      token_hash VARCHAR(255) NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      revoked_at TIMESTAMP NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id CHAR(36) PRIMARY KEY,
      user_id CHAR(36) NOT NULL,
      token_hash VARCHAR(255) NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id CHAR(36) PRIMARY KEY,
      company_id CHAR(36) NULL,
      user_id CHAR(36) NULL,
      action VARCHAR(120) NOT NULL,
      resource VARCHAR(120) NULL,
      ip VARCHAR(64) NULL,
      detail TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  authTablesReady = true;
}

/* ------------------------------------------------------------------ */
/* Seeding                                                             */
/* ------------------------------------------------------------------ */

export async function seedDemoUser() {
  // Platform-level super admin (no company).
  const superAdminEmail = 'superadmin@cargo.io';
  const existingSuper = await findUserByEmail(superAdminEmail);
  if (!existingSuper) {
    const id = generateId();
    const passwordHash = await bcrypt.hash('password123', 10);
    await query(`INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)`, [
      id,
      'Platform Admin',
      superAdminEmail,
      passwordHash,
    ]);
    await assignUserRole(id, 'super_admin', true);
  } else {
    // Idempotent: ensure the role exists (e.g. if a prior seed failed mid-way).
    const superRoles = await getUserRoles(existingSuper.id);
    if (!superRoles.includes('super_admin')) {
      await assignUserRole(existingSuper.id, 'super_admin', true);
    }
  }

  // Demo company with one user per role.
  let company = await queryOne<DbCompany>(
    `SELECT id, name, status, created_at, updated_at FROM companies WHERE name = 'Cargo Logistics' LIMIT 1`,
  );
  if (!company) {
    const created = await createCompany('Cargo Logistics');
    company = { id: created.id } as DbCompany;
  }

  const demoRoles: { email: string; name: string; role: UserRole }[] = [
    { email: 'demo@cargo.io', name: 'Dana Whitfield', role: 'company_owner' },
    { email: 'fleet@cargo.io', name: 'Frank Lin', role: 'fleet_manager' },
    { email: 'dispatch@cargo.io', name: 'Dana Patel', role: 'dispatcher' },
    { email: 'drivermgr@cargo.io', name: 'Dee Ruiz', role: 'driver_manager' },
    { email: 'maint@cargo.io', name: 'Max Turner', role: 'maintenance_manager' },
    { email: 'finance@cargo.io', name: 'Fiona Nash', role: 'finance_manager' },
    { email: 'support@cargo.io', name: 'Sam Cole', role: 'customer_support' },
    { email: 'driver@cargo.io', name: 'Marcus Reed', role: 'driver' },
    { email: 'customer@cargo.io', name: 'Casey Bloom', role: 'customer' },
  ];

  const passwordHash = await bcrypt.hash('password123', 10);

  for (const demo of demoRoles) {
    const existing = await findUserByEmail(demo.email);
    if (existing) {
      if (!existing.company_id) {
        await query(`UPDATE users SET company_id = ? WHERE id = ?`, [company.id, existing.id]);
      }
      const roles = await getUserRoles(existing.id);
      if (roles.length === 0) {
        await assignUserRole(existing.id, demo.role, true);
      }
      continue;
    }

    const id = generateId();
    await query(`INSERT INTO users (id, name, email, password, company_id) VALUES (?, ?, ?, ?, ?)`, [
      id,
      demo.name,
      demo.email,
      passwordHash,
      company.id,
    ]);
    await assignUserRole(id, demo.role, true);
  }

  return { companyId: company.id, users: demoRoles.map((d) => d.email) };
}

export { isPlatformRole };
