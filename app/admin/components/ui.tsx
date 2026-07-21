'use client';

import { ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAdminTheme } from './AdminThemeProvider';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/[0.06] bg-brand-800 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset,0_10px_30px_-15px_rgba(0,0,0,0.6)] ${className}`}
    >
      {children}
    </div>
  );
}

const ACCENTS: Record<string, { chip: string; ring: string }> = {
  indigo: { chip: 'bg-brand-700/25 text-brand-300', ring: 'text-brand-300' },
  emerald: { chip: 'bg-brand-600/12 text-brand-300', ring: 'text-brand-300' },
  amber: { chip: 'bg-amber-500/15 text-amber-300', ring: 'text-amber-300' },
  rose: { chip: 'bg-rose-500/15 text-rose-300', ring: 'text-rose-300' },
  sky: { chip: 'bg-brand-600/12 text-brand-300', ring: 'text-brand-300' },
  lime: { chip: 'bg-brand-600/12 text-brand-300', ring: 'text-brand-300' },
  teal: { chip: 'bg-brand-600/12 text-brand-300', ring: 'text-brand-300' },
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = 'indigo',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  accent?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'lime' | 'teal';
}) {
  const a = ACCENTS[accent] ?? ACCENTS.indigo;
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="flex items-start justify-between">
        <p className="text-[15px] font-medium text-slate-400">{label}</p>
        {icon && (
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-base ${a.chip}`}>
            {icon}
          </span>
        )}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
      {hint && (
        <span className={`mt-2 inline-flex items-center gap-1 text-sm font-medium ${a.ring}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${a.chip}`} />
          {hint}
        </span>
      )}
    </Card>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
}) {
  const variants: Record<string, string> = {
    primary: 'bg-brand-600 text-white hover:bg-brand-500 shadow-[0_8px_20px_-8px_rgba(26,82,196,0.35)]',
    secondary: 'border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]',
    danger: 'border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20',
    ghost: 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-[15px] font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Badge({ tone = 'slate', children }: { tone?: string; children: ReactNode }) {
  const tones: Record<string, string> = {
    slate: 'bg-white/[0.06] text-slate-300 ring-white/10',
    green: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20',
    red: 'bg-rose-500/10 text-rose-300 ring-rose-500/20',
    amber: 'bg-amber-500/10 text-amber-300 ring-amber-500/20',
    blue: 'bg-brand-600/12 text-brand-300 ring-brand-600/20',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${
        tones[tone] ?? tones.slate
      }`}
    >
      {children}
    </span>
  );
}

export function Modal({
  title,
  onClose,
  children,
  size = 'md',
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: 'md' | 'lg';
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`w-full overflow-hidden rounded-2xl border border-white/10 bg-brand-800 shadow-2xl ${
          size === 'lg' ? 'max-w-3xl' : 'max-w-lg'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
          >
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="block">
      <span className="mb-1 block text-sm font-medium text-slate-300">{label}</span>
      {children}
    </div>
  );
}

export const inputClass =
  'w-full rounded-lg border border-white/10 bg-brand-900/50 px-3 py-2 text-sm text-slate-100 shadow-none outline-none ring-0 placeholder-slate-500 transition focus:border-brand-600/50 focus:outline-none focus:ring-2 focus:ring-brand-600/20';

export type SelectOption = { value: string; label: string };

export function Select({
  value,
  onChange,
  options,
  className = '',
  disabled,
  placeholder = 'Select…',
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  const { resolved } = useAdminTheme();
  const light = resolved === 'light';
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [pos, setPos] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(
    null,
  );

  const selected = options.find((o) => o.value === value);

  function updatePosition() {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const preferBelow = spaceBelow >= 160 || spaceBelow >= spaceAbove;
    const maxHeight = Math.min(280, Math.max(120, preferBelow ? spaceBelow : spaceAbove));
    setPos({
      top: preferBelow ? rect.bottom + 6 : Math.max(8, rect.top - maxHeight - 6),
      left: rect.left,
      width: Math.max(rect.width, 160),
      maxHeight,
    });
  }

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    function onScroll() {
      updatePosition();
    }
    window.addEventListener('resize', onScroll);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
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
  }, [open]);

  const menu =
    open &&
    pos &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        ref={menuRef}
        id={listId}
        role="listbox"
        style={{
          position: 'fixed',
          top: pos.top,
          left: pos.left,
          width: pos.width,
          maxHeight: pos.maxHeight,
          zIndex: 80,
        }}
        className={`overflow-y-auto rounded-xl border py-1 shadow-2xl ${
          light
            ? 'border-slate-200 bg-white text-slate-800'
            : 'border-white/10 bg-brand-800 text-slate-100'
        }`}
      >
        {options.length === 0 ? (
          <p className="px-3 py-2 text-sm text-slate-500">No options</p>
        ) : (
          options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                  active
                    ? light
                      ? 'bg-brand-50 font-semibold text-brand-700'
                      : 'bg-brand-600/20 font-semibold text-brand-200'
                    : light
                      ? 'text-slate-700 hover:bg-slate-50'
                      : 'text-slate-200 hover:bg-white/[0.06]'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {active && <span className="ml-2 text-brand-500">✓</span>}
              </button>
            );
          })
        )}
      </div>,
      document.body,
    );

  return (
    <div className={`relative ${className.includes('w-auto') ? 'inline-block min-w-[11rem]' : 'w-full'}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={`${inputClass} flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-50 ${
          open ? 'border-brand-600/50 ring-2 ring-brand-600/20' : ''
        } ${className}`}
      >
        <span className={`truncate ${selected ? '' : 'text-slate-500'}`}>
          {selected?.label ?? placeholder}
        </span>
        <span
          className={`shrink-0 text-[10px] text-slate-500 transition ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          ▼
        </span>
      </button>
      {menu}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04] text-slate-500">
        ∅
      </div>
      <p className="text-[15px] text-slate-500">{message}</p>
    </div>
  );
}

/* Shared table styles for consistent dark tables */
export const theadClass = 'border-b border-white/[0.06] text-xs uppercase tracking-wider text-slate-500';
export const rowClass = 'border-b border-white/[0.04] transition-colors last:border-0 hover:bg-white/[0.02]';
