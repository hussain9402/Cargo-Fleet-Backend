'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type Broadcast } from '../lib/api';
import { useAdminTheme } from './AdminThemeProvider';

const READ_KEY = 'cf_admin_notif_read';

function loadReadIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(READ_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  window.localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
}

export function NotificationBell({ onViewAll }: { onViewAll: () => void }) {
  const { resolved } = useAdminTheme();
  const light = resolved === 'light';
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadIds());
  const rootRef = useRef<HTMLDivElement>(null);

  const unread = items.filter((b) => !readIds.has(b.id)).length;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ broadcasts: Broadcast[] }>('/broadcasts');
      setItems(res.broadcasts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load notifications');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (!open) return;
    void fetchItems();
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, fetchItems]);

  function markAllRead() {
    const next = new Set(readIds);
    items.forEach((b) => next.add(b.id));
    setReadIds(next);
    saveReadIds(next);
  }

  function openPanel() {
    setOpen((v) => !v);
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={openPanel}
        aria-label="Notifications"
        aria-expanded={open}
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-slate-400 transition hover:text-slate-200 ${
          light
            ? 'border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-700'
            : 'border-white/[0.06] bg-white/[0.03]'
        }`}
      >
        <span aria-hidden>🔔</span>
        {unread > 0 && (
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand-600" />
        )}
      </button>

      {open && (
        <div
          className={`absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border shadow-2xl ${
            light
              ? 'border-slate-200 bg-white text-slate-800'
              : 'border-white/[0.08] bg-brand-800 text-slate-200'
          }`}
        >
          <div
            className={`flex items-center justify-between border-b px-4 py-3 ${
              light ? 'border-slate-100' : 'border-white/[0.06]'
            }`}
          >
            <div>
              <p className={`text-sm font-semibold ${light ? 'text-slate-900' : 'text-white'}`}>
                Notifications
              </p>
              <p className="text-xs text-slate-500">
                {unread > 0 ? `${unread} unread` : 'You are up to date'}
              </p>
            </div>
            {items.length > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-medium text-brand-500 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <p className="px-4 py-8 text-center text-sm text-slate-500">Loading…</p>
            )}
            {!loading && error && (
              <p className="px-4 py-8 text-center text-sm text-rose-400">{error}</p>
            )}
            {!loading && !error && items.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-slate-500">No notifications yet.</p>
            )}
            {!loading &&
              !error &&
              items.slice(0, 12).map((b) => {
                const isUnread = !readIds.has(b.id);
                const when = (() => {
                  try {
                    return new Date(b.createdAt).toLocaleString();
                  } catch {
                    return '';
                  }
                })();
                return (
                  <div
                    key={b.id}
                    className={`border-b px-4 py-3 last:border-0 ${
                      light ? 'border-slate-100' : 'border-white/[0.04]'
                    } ${isUnread ? (light ? 'bg-brand-50/60' : 'bg-brand-600/10') : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      {isUnread && (
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />
                      )}
                      <div className={isUnread ? '' : 'pl-3.5'}>
                        <p
                          className={`text-sm font-semibold ${
                            light ? 'text-slate-900' : 'text-slate-100'
                          }`}
                        >
                          {b.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{b.body}</p>
                        {when && <p className="mt-1 text-[11px] text-slate-500">{when}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          <div
            className={`border-t px-3 py-2 ${light ? 'border-slate-100' : 'border-white/[0.06]'}`}
          >
            <button
              type="button"
              onClick={() => {
                markAllRead();
                setOpen(false);
                onViewAll();
              }}
              className={`w-full rounded-xl px-3 py-2 text-sm font-semibold transition ${
                light
                  ? 'text-brand-600 hover:bg-slate-50'
                  : 'text-brand-300 hover:bg-white/[0.04]'
              }`}
            >
              View all broadcasts
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
