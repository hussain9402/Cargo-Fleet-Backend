"use client";

import type { UserRole } from '@/app/lib/rbac/permissions';

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole | null;
  roles: UserRole[];
  companyId: string | null;
  company: { id: string; name: string; status: 'active' | 'suspended'; logoUrl: string | null } | null;
};

export type Company = {
  id: string;
  name: string;
  status: 'active' | 'suspended';
  logoUrl: string | null;
};

export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'suspended';
  companyId: string | null;
  companyName: string | null;
  role: UserRole | null;
  roles: UserRole[];
  createdAt: string;
};

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
  smtpPasswordSet: boolean;
  updatedAt: string | null;
};

export type Broadcast = {
  id: string;
  scope: string;
  title: string;
  body: string;
  audience: string;
  createdBy: string | null;
  createdAt: string;
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
  createdAt: string;
};

export type RoleInfo = {
  role: UserRole;
  label: string;
  description: string;
  defaultLabel: string;
  defaultDescription: string;
  permissions: string[];
  defaults: string[];
  enabled: boolean;
  isCustomized: boolean;
  inheritedFromPlatform?: boolean;
  editable: boolean;
  userCount: number;
};

export type DashboardSummary = {
  vehicles: { total: number; moving: number; idle: number; maintenance: number };
  drivers: { total: number; onTrip: number; resting: number; offDuty: number };
  trips: { total: number; inTransit: number; scheduled: number; delayed: number; completed: number };
  fleetHealth: number;
};

const TOKEN_KEY = 'cf_admin_access';
const REFRESH_KEY = 'cf_admin_refresh';
const USER_KEY = 'cf_admin_user';

const LOGIN_PATH = '/admin/login';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

function getRefreshToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export function getStoredUser(): AdminUser | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
}

function setSession(user: AdminUser, accessToken: string, refreshToken: string) {
  window.localStorage.setItem(TOKEN_KEY, accessToken);
  window.localStorage.setItem(REFRESH_KEY, refreshToken);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function updateStoredUser(user: AdminUser) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
  window.localStorage.removeItem(USER_KEY);
}

/** Clear session and send the user to login (no-op if already there). */
export function forceLogout(reason?: string) {
  clearSession();
  if (typeof window === 'undefined') return;
  const path = window.location.pathname;
  if (path.startsWith('/admin/login') || path.startsWith('/admin/forgot-password') || path.startsWith('/admin/signup')) {
    return;
  }
  const q = reason ? `?reason=${encodeURIComponent(reason)}` : '?reason=session';
  window.location.replace(`${LOGIN_PATH}${q}`);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Read JWT `exp` (ms) without verifying — used only to schedule refresh. */
export function getAccessTokenExpiryMs(token: string | null = getToken()): number | null {
  if (!token) return null;
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return false;
      const user = (data as { user: AdminUser }).user;
      const accessToken = (data as { accessToken: string }).accessToken;
      const nextRefresh = (data as { refreshToken: string }).refreshToken;
      if (!user || !accessToken || !nextRefresh) return false;
      setSession(user, accessToken, nextRefresh);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/** Try to renew the access token; logs out if refresh is impossible. */
export async function ensureFreshSession(): Promise<boolean> {
  if (!getToken() && !getRefreshToken()) {
    forceLogout('session');
    return false;
  }

  const exp = getAccessTokenExpiryMs();
  // Renew if missing exp, already expired, or expiring within 90s
  if (exp && exp - Date.now() > 90_000) return true;

  const ok = await refreshAccessToken();
  if (!ok) {
    forceLogout('session');
    return false;
  }
  return true;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  async function once(token: string | null): Promise<Response> {
    return fetch(`/api/v1${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers as Record<string, string> | undefined),
      },
    });
  }

  let res = await once(getToken());

  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await once(getToken());
    } else {
      forceLogout('session');
      throw new ApiError('Session expired', 401);
    }
  }

  if (res.status === 401) {
    forceLogout('session');
    throw new ApiError('Session expired', 401);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError((data as { error?: string }).error ?? 'Request failed', res.status);
  }
  return data as T;
}

export async function login(email: string, password: string) {
  const res = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError((data as { error?: string }).error ?? 'Login failed', res.status);
  }
  setSession(data.user, data.accessToken, data.refreshToken);
  return data.user as AdminUser;
}

export async function startCompanySignup(input: {
  fullName: string;
  email: string;
  password: string;
  companyName: string;
}) {
  const res = await fetch('/api/v1/auth/register/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError((data as { error?: string }).error ?? 'Unable to start signup', res.status);
  }
  return data as { message: string; email: string };
}

export async function verifyCompanySignup(email: string, code: string) {
  const res = await fetch('/api/v1/auth/register/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError((data as { error?: string }).error ?? 'Unable to verify signup', res.status);
  }
  setSession(data.user, data.accessToken, data.refreshToken);
  return data.user as AdminUser;
}

export async function resendCompanySignupOtp(email: string) {
  const res = await fetch('/api/v1/auth/register/resend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError((data as { error?: string }).error ?? 'Unable to resend code', res.status);
  }
  return data as { message: string; email: string };
}

export async function forgotPassword(email: string) {
  const res = await fetch('/api/v1/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError((data as { error?: string }).error ?? 'Unable to send reset email', res.status);
  }
  return data as { message: string };
}

export async function resetPassword(email: string, code: string, password: string) {
  const res = await fetch('/api/v1/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError((data as { error?: string }).error ?? 'Unable to reset password', res.status);
  }
  return data as { message: string };
}

export async function logout() {
  const refreshToken = typeof window !== 'undefined' ? window.localStorage.getItem(REFRESH_KEY) : null;
  try {
    if (refreshToken) {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    }
  } catch {
    // ignore
  }
  clearSession();
}

export function roleLabel(role: UserRole | null): string {
  if (!role) return '—';
  return role
    .split('_')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}
