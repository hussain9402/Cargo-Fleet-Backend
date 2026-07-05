import { NextRequest } from 'next/server';
import { verifyAccessToken } from './jwt';

export function getBearerToken(request: NextRequest) {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    return null;
  }
  return header.slice(7).trim();
}

export function getAuthPayload(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) {
    return null;
  }

  const payload = verifyAccessToken(token);
  if (!payload || typeof payload.sub !== 'string') {
    return null;
  }

  return payload;
}
