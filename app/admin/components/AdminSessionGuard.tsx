'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  ensureFreshSession,
  getAccessTokenExpiryMs,
  getToken,
  forceLogout,
} from '../lib/api';

const PUBLIC_PREFIXES = ['/admin/login', '/admin/forgot-password', '/admin/signup'];

function isPublicAdminPath(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Keeps the admin session alive while active, and auto-logs out when
 * access + refresh tokens are no longer valid — even if the user is idle.
 */
export function AdminSessionGuard() {
  const pathname = usePathname();

  useEffect(() => {
    if (isPublicAdminPath(pathname)) return;

    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    function scheduleRefresh() {
      if (refreshTimer) clearTimeout(refreshTimer);
      const exp = getAccessTokenExpiryMs();
      if (!exp) {
        // No readable exp — check periodically
        refreshTimer = setTimeout(() => {
          void tick();
        }, 60_000);
        return;
      }
      // Refresh 90s before expiry (min 5s from now)
      const delay = Math.max(5_000, exp - Date.now() - 90_000);
      refreshTimer = setTimeout(() => {
        void tick();
      }, delay);
    }

    async function tick() {
      if (cancelled) return;
      if (!getToken()) {
        forceLogout('session');
        return;
      }
      const ok = await ensureFreshSession();
      if (!cancelled && ok) scheduleRefresh();
    }

    void tick();

    function onFocus() {
      void tick();
    }
    function onVisibility() {
      if (document.visibilityState === 'visible') void tick();
    }

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    const heartbeat = setInterval(() => {
      void tick();
    }, 5 * 60_000);

    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      clearInterval(heartbeat);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [pathname]);

  return null;
}
