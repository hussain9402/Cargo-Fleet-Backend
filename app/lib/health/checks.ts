import { query, resetPool } from '../db';
import {
  buildHealthUrlsWithPublic,
  getServerPort,
} from './network';

export type ServiceStatus = {
  configured: boolean;
  connected: boolean;
  message: string;
};

export type HealthReport = {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  port: number;
  database: ServiceStatus;
  smtp: ServiceStatus;
  urls: {
    localhost: string;
    network: string[];
    public: string | null;
    publicIp: string | null;
    admin: {
      localhost: string;
      network: string[];
      public: string | null;
    };
  };
  healthPath: string;
  adminPath: string;
};

export async function checkDatabaseConnection(): Promise<ServiceStatus> {
  const usingUrl = Boolean(process.env.MYSQL_URL) &&
    !process.env.MYSQL_HOST &&
    !process.env.MYSQL_USER &&
    !process.env.MYSQL_DATABASE;

  const hasConfig = Boolean(
    process.env.MYSQL_URL ||
      process.env.MYSQL_HOST ||
      process.env.MYSQL_USER ||
      process.env.MYSQL_DATABASE,
  );

  if (!hasConfig) {
    return {
      configured: false,
      connected: false,
      message: 'MySQL env vars not set (MYSQL_HOST/MYSQL_USER/MYSQL_PASSWORD/MYSQL_DATABASE)',
    };
  }

  const source = usingUrl ? 'MYSQL_URL' : `MYSQL_HOST=${process.env.MYSQL_HOST || 'localhost'}`;
  const user = process.env.MYSQL_USER || 'root';
  const database = process.env.MYSQL_DATABASE || 'cargo_fleet';

  try {
    await query<{ ok: number }[]>('SELECT 1 AS ok');
    return {
      configured: true,
      connected: true,
      message: `Connected to ${database} as ${user} (${source})`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection failed';
    if (message.includes('Access denied')) {
      resetPool();
    }
    return {
      configured: true,
      connected: false,
      message: `${message} — using ${source}, user=${user}, database=${database}`,
    };
  }
}

export async function checkSmtpConnection(): Promise<ServiceStatus> {
  const { resolveSmtp } = await import('../auth/mail');
  const smtp = await resolveSmtp();

  if (!smtp) {
    return {
      configured: false,
      connected: false,
      message: 'SMTP not set — configure in Super Admin → Settings → SMTP (or SMTP_* env)',
    };
  }

  try {
    const nodemailer = (await import('nodemailer')).default;
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: { user: smtp.user, pass: smtp.pass },
    });

    await transporter.verify();

    return {
      configured: true,
      connected: true,
      message: `Connected to ${smtp.host}:${smtp.port} (${smtp.source})`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SMTP verification failed';
    return {
      configured: true,
      connected: false,
      message: `${message} (${smtp.source})`,
    };
  }
}

export async function getHealthReport(): Promise<HealthReport> {
  const port = getServerPort();
  const [database, smtp, urls] = await Promise.all([
    checkDatabaseConnection(),
    checkSmtpConnection(),
    buildHealthUrlsWithPublic(port),
  ]);

  const criticalFailure = database.configured && !database.connected;
  const status = criticalFailure ? 'error' : database.connected && smtp.connected ? 'ok' : 'degraded';

  return {
    status,
    timestamp: new Date().toISOString(),
    port,
    database,
    smtp,
    urls,
    healthPath: '/api/health',
    adminPath: '/admin/login',
  };
}

export function formatStartupBanner(report: HealthReport) {
  const dbIcon = report.database.connected ? '✓' : report.database.configured ? '✗' : '–';
  const smtpIcon = report.smtp.connected ? '✓' : report.smtp.configured ? '✗' : '–';

  const lines = [
    '',
    '══════════════════════════════════════════════════════',
    '  Cargo Fleet Backend',
    '══════════════════════════════════════════════════════',
    `  MySQL  [${dbIcon}]  ${report.database.message}`,
    `  SMTP   [${smtpIcon}]  ${report.smtp.message}`,
    '──────────────────────────────────────────────────────',
    '  Health API',
    `  • Localhost   ${report.urls.localhost}`,
  ];

  if (report.urls.network.length) {
    for (const url of report.urls.network) {
      lines.push(`  • Network     ${url}`);
    }
  } else {
    lines.push('  • Network     (no LAN IP found — use npm run dev with -H 0.0.0.0)');
  }

  if (report.urls.public) {
    lines.push(`  • Public IP   ${report.urls.public}`);
    lines.push('    (requires port forwarding on your router to reach from outside)');
  } else {
    lines.push('  • Public IP   (unavailable — check internet connection)');
  }

  lines.push('──────────────────────────────────────────────────────');
  lines.push('  Website');
  lines.push(`  • Landing           http://localhost:${report.port}/`);
  lines.push(`  • Create account    http://localhost:${report.port}/signup`);
  lines.push('──────────────────────────────────────────────────────');
  lines.push('  Admin panels (same login URL — panel depends on account)');
  lines.push('  • SaaS Super Admin   use: superadmin@cargo.io');
  lines.push('  • Company Admin      use: owner@demo.com (or any company_owner)');
  lines.push(`  • Localhost          ${report.urls.admin.localhost}`);

  if (report.urls.admin.network.length) {
    for (const url of report.urls.admin.network) {
      lines.push(`  • Network            ${url}`);
    }
  } else {
    lines.push('  • Network            (no LAN IP found — use npm run dev with -H 0.0.0.0)');
  }

  if (report.urls.admin.public) {
    lines.push(`  • Public IP          ${report.urls.admin.public}`);
  } else {
    lines.push('  • Public IP          (unavailable — check internet connection)');
  }

  lines.push('══════════════════════════════════════════════════════', '');

  return lines.join('\n');
}

export async function logStartupStatus() {
  const report = await getHealthReport();
  console.log(formatStartupBanner(report));
  return report;
}
