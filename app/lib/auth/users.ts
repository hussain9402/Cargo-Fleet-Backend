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
import type { AuthResponse, AuthUser, DbUser, UserRole } from './types';

const USER_COLUMNS =
  'id, name, email, password, role, google_id, created_at, updated_at';

export function toAuthUser(user: DbUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

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

async function storeRefreshToken(userId: string, refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  const expiresAt = getRefreshExpiryDate();

  await query(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`,
    [generateId(), userId, tokenHash, expiresAt],
  );
}

export async function createAuthSession(user: DbUser): Promise<AuthResponse> {
  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  const refreshToken = createRefreshToken();
  await storeRefreshToken(user.id, refreshToken);

  return {
    user: toAuthUser(user),
    accessToken,
    refreshToken,
  };
}

export async function registerUser(input: {
  email: string;
  password: string;
  fullName: string;
}) {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new Error('EMAIL_EXISTS');
  }

  const id = generateId();
  const passwordHash = await bcrypt.hash(input.password, 10);

  await query(`INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)`, [
    id,
    input.fullName,
    input.email.toLowerCase(),
    passwordHash,
  ]);

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
      const id = generateId();
      await query(`INSERT INTO users (id, name, email, google_id) VALUES (?, ?, ?, ?)`, [
        id,
        profile.name,
        profile.email,
        profile.googleId,
      ]);
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

export async function updateUserRole(userId: string, role: UserRole) {
  await query(`UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?`, [role, userId]);
  const user = await findUserById(userId);

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  return toAuthUser(user);
}

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

export async function ensureAuthTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id CHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NULL,
      role ENUM('manager', 'dispatcher', 'driver') NULL,
      google_id VARCHAR(255) NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

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
}

export async function seedDemoUser() {
  const email = 'demo@cargo.io';
  const existing = await findUserByEmail(email);
  if (existing) {
    return existing;
  }

  const id = generateId();
  const passwordHash = await bcrypt.hash('password123', 10);

  await query(`INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)`, [
    id,
    'Dana Whitfield',
    email,
    passwordHash,
    'manager',
  ]);

  return findUserById(id);
}
