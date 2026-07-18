import { generateId, query, queryOne } from '../db';

/** Scope key for per-tenant data: a company id, or the string 'platform' for super-admin scope. */
export const PLATFORM_SCOPE = 'platform';

export type ScopeSettings = {
  scope: string;
  timezone: string;
  locale: string;
  theme: 'system' | 'light' | 'dark';
  weeklyReport: boolean;
  itemsPerPage: number;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean;
  smtpUser: string | null;
  smtpFrom: string | null;
  smtpFromName: string | null;
  /** True when an SMTP password is stored (the value itself is never returned). */
  smtpPasswordSet: boolean;
  updatedAt: Date | null;
};

export type Broadcast = {
  id: string;
  scope: string;
  title: string;
  body: string;
  audience: string;
  createdBy: string | null;
  createdAt: Date;
};

export type ContactMessage = {
  id: string;
  companyId: string | null;
  companyName: string | null;
  userId: string | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'open' | 'resolved';
  createdAt: Date;
};

let ensured = false;

export async function ensureAdminTables() {
  if (ensured) return;

  await query(`
    CREATE TABLE IF NOT EXISTS scope_settings (
      scope VARCHAR(64) PRIMARY KEY,
      timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
      locale VARCHAR(16) NOT NULL DEFAULT 'en',
      theme VARCHAR(16) NOT NULL DEFAULT 'system',
      weekly_report TINYINT(1) NOT NULL DEFAULT 0,
      items_per_page INT NOT NULL DEFAULT 20,
      smtp_host VARCHAR(255) NULL,
      smtp_port INT NULL,
      smtp_secure TINYINT(1) NOT NULL DEFAULT 1,
      smtp_user VARCHAR(255) NULL,
      smtp_pass VARCHAR(255) NULL,
      smtp_from VARCHAR(255) NULL,
      smtp_from_name VARCHAR(255) NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS broadcasts (
      id CHAR(36) PRIMARY KEY,
      scope VARCHAR(64) NOT NULL,
      title VARCHAR(255) NOT NULL,
      body TEXT NOT NULL,
      audience VARCHAR(64) NOT NULL DEFAULT 'all',
      created_by CHAR(36) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id CHAR(36) PRIMARY KEY,
      company_id CHAR(36) NULL,
      user_id CHAR(36) NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'open',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  ensured = true;
}

type DbSettings = {
  scope: string;
  timezone: string;
  locale: string;
  theme: string;
  weekly_report: number;
  items_per_page: number;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_secure: number;
  smtp_user: string | null;
  smtp_pass: string | null;
  smtp_from: string | null;
  smtp_from_name: string | null;
  updated_at: Date | null;
};

function mapSettings(row: DbSettings | null, scope: string): ScopeSettings {
  if (!row) {
    return {
      scope,
      timezone: 'UTC',
      locale: 'en',
      theme: 'system',
      weeklyReport: false,
      itemsPerPage: 20,
      smtpHost: null,
      smtpPort: null,
      smtpSecure: true,
      smtpUser: null,
      smtpFrom: null,
      smtpFromName: null,
      smtpPasswordSet: false,
      updatedAt: null,
    };
  }
  return {
    scope: row.scope,
    timezone: row.timezone,
    locale: row.locale,
    theme: (row.theme as ScopeSettings['theme']) ?? 'system',
    weeklyReport: !!row.weekly_report,
    itemsPerPage: row.items_per_page,
    smtpHost: row.smtp_host,
    smtpPort: row.smtp_port,
    smtpSecure: !!row.smtp_secure,
    smtpUser: row.smtp_user,
    smtpFrom: row.smtp_from,
    smtpFromName: row.smtp_from_name,
    smtpPasswordSet: !!row.smtp_pass,
    updatedAt: row.updated_at,
  };
}

export async function getSettings(scope: string): Promise<ScopeSettings> {
  await ensureAdminTables();
  const row = await queryOne<DbSettings>(`SELECT * FROM scope_settings WHERE scope = ?`, [scope]);
  return mapSettings(row, scope);
}

export async function upsertSettings(
  scope: string,
  patch: Partial<{
    timezone: string;
    locale: string;
    theme: string;
    weeklyReport: boolean;
    itemsPerPage: number;
    smtpHost: string | null;
    smtpPort: number | null;
    smtpSecure: boolean;
    smtpUser: string | null;
    smtpPassword: string | null;
    smtpFrom: string | null;
    smtpFromName: string | null;
  }>,
): Promise<ScopeSettings> {
  await ensureAdminTables();
  // Ensure a row exists.
  await query(`INSERT IGNORE INTO scope_settings (scope) VALUES (?)`, [scope]);

  const sets: string[] = [];
  const params: unknown[] = [];
  const map: Record<string, string> = {
    timezone: 'timezone',
    locale: 'locale',
    theme: 'theme',
    weeklyReport: 'weekly_report',
    itemsPerPage: 'items_per_page',
    smtpHost: 'smtp_host',
    smtpPort: 'smtp_port',
    smtpSecure: 'smtp_secure',
    smtpUser: 'smtp_user',
    smtpFrom: 'smtp_from',
    smtpFromName: 'smtp_from_name',
  };

  for (const [key, column] of Object.entries(map)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value !== undefined) {
      sets.push(`${column} = ?`);
      params.push(typeof value === 'boolean' ? (value ? 1 : 0) : value);
    }
  }
  // Only overwrite the SMTP password when a non-empty value is supplied.
  if (patch.smtpPassword) {
    sets.push('smtp_pass = ?');
    params.push(patch.smtpPassword);
  }

  if (sets.length) {
    params.push(scope);
    await query(`UPDATE scope_settings SET ${sets.join(', ')} WHERE scope = ?`, params);
  }
  return getSettings(scope);
}

/* --- Broadcasts --- */

type DbBroadcast = {
  id: string;
  scope: string;
  title: string;
  body: string;
  audience: string;
  created_by: string | null;
  created_at: Date;
};

export async function listBroadcasts(scope: string): Promise<Broadcast[]> {
  await ensureAdminTables();
  const rows = await query<DbBroadcast[]>(
    `SELECT * FROM broadcasts WHERE scope = ? ORDER BY created_at DESC LIMIT 100`,
    [scope],
  );
  return rows.map((r) => ({
    id: r.id,
    scope: r.scope,
    title: r.title,
    body: r.body,
    audience: r.audience,
    createdBy: r.created_by,
    createdAt: r.created_at,
  }));
}

export async function createBroadcast(input: {
  scope: string;
  title: string;
  body: string;
  audience?: string;
  createdBy: string;
}): Promise<string> {
  await ensureAdminTables();
  const id = generateId();
  await query(
    `INSERT INTO broadcasts (id, scope, title, body, audience, created_by) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, input.scope, input.title, input.body, input.audience ?? 'all', input.createdBy],
  );
  return id;
}

export async function deleteBroadcast(id: string, scope: string) {
  await query(`DELETE FROM broadcasts WHERE id = ? AND scope = ?`, [id, scope]);
}

/* --- Contact messages --- */

type DbContact = {
  id: string;
  company_id: string | null;
  user_id: string | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  created_at: Date;
  company_name?: string | null;
};

function mapContact(r: DbContact): ContactMessage {
  return {
    id: r.id,
    companyId: r.company_id,
    companyName: r.company_name ?? null,
    userId: r.user_id,
    name: r.name,
    email: r.email,
    subject: r.subject,
    message: r.message,
    status: (r.status as ContactMessage['status']) ?? 'open',
    createdAt: r.created_at,
  };
}

/** Platform admin sees every message; a company sees only its own. */
export async function listContactMessages(companyId: string | null): Promise<ContactMessage[]> {
  await ensureAdminTables();
  const rows = companyId
    ? await query<DbContact[]>(
        `SELECT cm.*, c.name AS company_name FROM contact_messages cm
         LEFT JOIN companies c ON c.id = cm.company_id
         WHERE cm.company_id = ? ORDER BY cm.created_at DESC LIMIT 200`,
        [companyId],
      )
    : await query<DbContact[]>(
        `SELECT cm.*, c.name AS company_name FROM contact_messages cm
         LEFT JOIN companies c ON c.id = cm.company_id
         ORDER BY cm.created_at DESC LIMIT 200`,
      );
  return rows.map(mapContact);
}

export async function createContactMessage(input: {
  companyId: string | null;
  userId: string | null;
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<string> {
  await ensureAdminTables();
  const id = generateId();
  await query(
    `INSERT INTO contact_messages (id, company_id, user_id, name, email, subject, message)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, input.companyId, input.userId, input.name, input.email, input.subject, input.message],
  );
  return id;
}

export async function setContactStatus(
  id: string,
  status: 'open' | 'resolved',
  companyId: string | null,
) {
  // When companyId is provided (non-platform), scope the update to that tenant.
  if (companyId) {
    await query(`UPDATE contact_messages SET status = ? WHERE id = ? AND company_id = ?`, [
      status,
      id,
      companyId,
    ]);
  } else {
    await query(`UPDATE contact_messages SET status = ? WHERE id = ?`, [status, id]);
  }
}
