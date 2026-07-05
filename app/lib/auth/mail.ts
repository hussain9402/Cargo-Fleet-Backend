import nodemailer from 'nodemailer';

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('SMTP_NOT_CONFIGURED');
  }

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });
}

export async function sendPasswordResetEmail(to: string, code: string) {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const appName = process.env.APP_NAME || 'Cargo Fleet';

  await transporter.sendMail({
    from,
    to,
    subject: `${appName} — Password reset code`,
    text: [
      `Your password reset code is: ${code}`,
      '',
      'This code expires in 1 hour.',
      'If you did not request a reset, you can ignore this email.',
    ].join('\n'),
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="margin:0 0 16px">${appName}</h2>
        <p>Use this code to reset your password:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:4px;margin:24px 0">${code}</p>
        <p style="color:#666;font-size:14px">This code expires in 1 hour. If you did not request a reset, ignore this email.</p>
      </div>
    `,
  });
}

export function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}
