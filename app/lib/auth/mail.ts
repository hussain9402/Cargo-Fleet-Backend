import nodemailer from 'nodemailer';
import { getSmtpCredentials, PLATFORM_SCOPE } from '../admin/admin';

export type ResolvedSmtp = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  source: 'platform' | 'env';
};

export type EmailBrand = {
  name: string;
  logoUrl?: string | null;
};

/** Prefer Super Admin (platform) SMTP from DB, then fall back to process.env. */
export async function resolveSmtp(): Promise<ResolvedSmtp | null> {
  const platform = await getSmtpCredentials(PLATFORM_SCOPE);
  if (platform) {
    return {
      host: platform.host,
      port: platform.port,
      secure: platform.secure,
      user: platform.user,
      pass: platform.pass,
      from: platform.from,
      source: 'platform',
    };
  }

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  return {
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user,
    pass,
    from: process.env.SMTP_FROM || user,
    source: 'env',
  };
}

async function getTransporter() {
  const smtp = await resolveSmtp();
  if (!smtp) throw new Error('SMTP_NOT_CONFIGURED');

  return {
    transporter: nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: { user: smtp.user, pass: smtp.pass },
    }),
    from: smtp.from,
  };
}

export async function isSmtpConfigured() {
  return Boolean(await resolveSmtp());
}

function absolutePublicUrl(pathOrUrl: string | null | undefined) {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return pathOrUrl;
  const base = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
}

async function sendCodeEmail(opts: {
  to: string;
  subject: string;
  heading: string;
  code: string;
  hint: string;
  brand?: EmailBrand;
}) {
  const { transporter, from } = await getTransporter();
  const brandName = opts.brand?.name || process.env.APP_NAME || 'FleetFlow';
  const logoAbs = absolutePublicUrl(opts.brand?.logoUrl ?? null);
  const logoHtml = logoAbs
    ? `<img src="${logoAbs}" alt="${brandName}" style="max-height:48px;width:auto;margin-bottom:16px" />`
    : `<p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#0045DD;margin:0 0 8px">${brandName}</p>`;

  await transporter.sendMail({
    from: opts.brand?.name ? `${opts.brand.name} <${from.match(/<(.+)>/)?.[1] || from}>` : from,
    to: opts.to,
    subject: opts.subject,
    text: [`${brandName}`, '', opts.heading, '', `Your code is: ${opts.code}`, '', opts.hint].join('\n'),
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#F4F6FB;color:#010000">
        ${logoHtml}
        <h2 style="margin:0 0 16px;color:#010000">${opts.heading}</h2>
        <p style="color:#002C8F">${opts.hint}</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:28px 0;color:#010000">${opts.code}</p>
        <p style="color:#0045DD;font-size:13px">This code expires in 15 minutes. If you did not request this, ignore this email.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, code: string, brand?: EmailBrand) {
  const name = brand?.name || process.env.APP_NAME || 'FleetFlow';
  await sendCodeEmail({
    to,
    subject: `${name} — Password reset code`,
    heading: 'Password reset',
    code,
    hint: `Use this code to reset your ${name} password.`,
    brand,
  });
}

export async function sendSignupOtpEmail(to: string, code: string, companyName: string) {
  await sendCodeEmail({
    to,
    subject: `${companyName} — Verify your carrier account`,
    heading: 'Verify your email',
    code,
    hint: `Confirm your email to create “${companyName}”. The account is created only after this code is verified.`,
    brand: { name: companyName },
  });
}
