"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, getToken, type ScopeSettings } from '../lib/api';

export type AdminThemeMode = 'system' | 'light' | 'dark';
export type ResolvedAdminTheme = 'light' | 'dark';

const STORAGE_KEY = 'fleetflow-admin-theme';

type ThemeContextValue = {
  mode: AdminThemeMode;
  resolved: ResolvedAdminTheme;
  setMode: (mode: AdminThemeMode) => void;
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveMode(mode: AdminThemeMode): ResolvedAdminTheme {
  if (mode === 'light' || mode === 'dark') return mode;
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function readStoredMode(): AdminThemeMode {
  if (typeof window === 'undefined') return 'system';
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  return 'system';
}

function applyDomTheme(resolved: ResolvedAdminTheme) {
  const roots = document.querySelectorAll('.admin-theme');
  roots.forEach((el) => {
    el.setAttribute('data-theme', resolved);
  });
  document.documentElement.setAttribute('data-admin-theme', resolved);
}

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AdminThemeMode>('system');
  const [resolved, setResolved] = useState<ResolvedAdminTheme>('dark');
  const [ready, setReady] = useState(false);

  const apply = useCallback((next: AdminThemeMode) => {
    const r = resolveMode(next);
    setModeState(next);
    setResolved(r);
    applyDomTheme(r);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  useEffect(() => {
    const initial = readStoredMode();
    apply(initial);
    setReady(true);

    let cancelled = false;
    (async () => {
      if (!getToken()) return;
      try {
        const res = await api<{ settings: ScopeSettings }>('/settings');
        if (cancelled) return;
        if (res.settings?.theme) apply(res.settings.theme);
      } catch {
        // keep local preference
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apply]);

  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => apply('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [mode, apply]);

  const value = useMemo(
    () => ({
      mode,
      resolved,
      setMode: apply,
      ready,
    }),
    [mode, resolved, apply, ready],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAdminTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      mode: 'system' as AdminThemeMode,
      resolved: 'dark' as ResolvedAdminTheme,
      setMode: (_m: AdminThemeMode) => {},
      ready: false,
    };
  }
  return ctx;
}
