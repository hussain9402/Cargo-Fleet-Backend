import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(value: string) {
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function getSecret() {
  const secret = process.env.JWT_ACCESS_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET or AUTH_SECRET must be configured');
  }
  return secret;
}

export function signAccessToken(payload: Record<string, unknown>) {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const expiresInSec = Number(process.env.JWT_ACCESS_EXPIRES_IN_SEC || 3600);
  const body = base64UrlEncode(
    JSON.stringify({
      ...payload,
      exp: Math.floor(Date.now() / 1000) + expiresInSec,
    }),
  );
  const signature = createHmac('sha256', getSecret())
    .update(`${header}.${body}`)
    .digest('base64url');

  return `${header}.${body}.${signature}`;
}

export function verifyAccessToken(token: string) {
  const [header, body, signature] = token.split('.');
  if (!header || !body || !signature) {
    return null;
  }

  const expected = createHmac('sha256', getSecret())
    .update(`${header}.${body}`)
    .digest('base64url');

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

  const payload = JSON.parse(base64UrlDecode(body)) as Record<string, unknown>;
  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

export function createRefreshToken() {
  return randomBytes(48).toString('hex');
}

export function hashToken(token: string) {
  return createHmac('sha256', getSecret()).update(token).digest('hex');
}

export function getRefreshExpiryDate() {
  const days = Number(process.env.JWT_REFRESH_EXPIRES_IN_DAYS || 30);
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
