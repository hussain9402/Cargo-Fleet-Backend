"use client";

import { ReactNode } from 'react';

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
  emerald: { chip: 'bg-brand-500/15 text-brand-300', ring: 'text-brand-300' },
  amber: { chip: 'bg-amber-500/15 text-amber-300', ring: 'text-amber-300' },
  rose: { chip: 'bg-rose-500/15 text-rose-300', ring: 'text-rose-300' },
  sky: { chip: 'bg-brand-500/15 text-brand-300', ring: 'text-brand-300' },
  lime: { chip: 'bg-brand-500/15 text-brand-300', ring: 'text-brand-300' },
  teal: { chip: 'bg-brand-500/15 text-brand-300', ring: 'text-brand-300' },
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
        <p className="text-sm font-medium text-slate-400">{label}</p>
        {icon && (
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-base ${a.chip}`}>
            {icon}
          </span>
        )}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
      {hint && (
        <span className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${a.ring}`}>
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
    primary: 'bg-brand-500 text-brand-900 hover:bg-brand-400 shadow-[0_8px_20px_-8px_rgba(95,149,152,0.5)]',
    secondary: 'border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]',
    danger: 'border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20',
    ghost: 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
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
    blue: 'bg-brand-500/15 text-brand-300 ring-brand-500/25',
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
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-brand-800 shadow-2xl"
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
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-300">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  'w-full rounded-lg border border-white/10 bg-brand-900/50 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/25';

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04] text-slate-500">
        ∅
      </div>
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

/* Shared table styles for consistent dark tables */
export const theadClass = 'border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-slate-500';
export const rowClass = 'border-b border-white/[0.04] transition-colors last:border-0 hover:bg-white/[0.02]';
