"use client";

import type { ReactNode } from 'react';

const bone = 'rounded-md bg-white/[0.06]';
const shimmer =
  'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/[0.06] before:to-transparent';

function Bone({ className = '' }: { className?: string }) {
  return <div className={`${bone} ${className}`} />;
}

function ShellCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`${shimmer} rounded-2xl border border-white/[0.06] bg-brand-800 ${className}`}
    >
      {children}
    </div>
  );
}

/** Full admin console shell while /auth/me resolves. */
export function AdminShellSkeleton() {
  return (
    <div className="flex min-h-screen bg-brand-900 text-slate-200">
      <aside className="fixed inset-y-0 left-0 flex w-[260px] flex-col border-r border-white/[0.06] bg-brand-900">
        <div className="flex h-[72px] items-center gap-3 border-b border-white/[0.06] px-5">
          <Bone className="h-9 w-9 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Bone className="h-3.5 w-28" />
            <Bone className="h-2.5 w-16" />
          </div>
        </div>
        <div className="space-y-2 px-4 py-5">
          <Bone className="mb-3 h-2.5 w-12" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
              <Bone className="h-8 w-8 rounded-lg" />
              <Bone className={`h-3 ${i % 3 === 0 ? 'w-24' : 'w-20'}`} />
            </div>
          ))}
        </div>
        <div className="mt-auto border-t border-white/[0.06] p-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">
            <Bone className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Bone className="h-3 w-24" />
              <Bone className="h-2.5 w-16" />
            </div>
          </div>
        </div>
      </aside>

      <main className="ml-[260px] flex-1">
        <header className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div className="space-y-2">
            <Bone className="h-2.5 w-20" />
            <Bone className="h-5 w-36" />
          </div>
          <div className="flex items-center gap-3">
            <Bone className="hidden h-10 w-44 rounded-xl md:block" />
            <Bone className="h-10 w-10 rounded-xl" />
            <Bone className="h-10 w-28 rounded-xl" />
          </div>
        </header>
        <div className="px-4 py-7 lg:px-6">
          <DashboardSkeleton />
        </div>
      </main>
    </div>
  );
}

/** Overview / dashboard layout. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy aria-label="Loading">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <ShellCard key={i} className="p-5">
            <div className="flex items-start justify-between">
              <Bone className="h-3.5 w-20" />
              <Bone className="h-9 w-9 rounded-xl" />
            </div>
            <Bone className="mt-4 h-8 w-16" />
            <Bone className="mt-3 h-2.5 w-24" />
          </ShellCard>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ShellCard className="p-6 lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <div className="space-y-2">
              <Bone className="h-4 w-32" />
              <Bone className="h-2.5 w-40" />
            </div>
            <Bone className="h-6 w-14 rounded-full" />
          </div>
          <Bone className="h-[170px] w-full rounded-xl" />
        </ShellCard>
        <ShellCard className="flex flex-col items-center p-6">
          <Bone className="mb-4 h-4 w-28 self-start" />
          <Bone className="h-36 w-36 rounded-full" />
          <Bone className="mt-4 h-3 w-24" />
        </ShellCard>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <ShellCard key={i} className="p-6">
            <Bone className="mb-5 h-4 w-28" />
            <Bone className="mx-auto h-32 w-32 rounded-full" />
            <div className="mt-5 space-y-2">
              <Bone className="h-2.5 w-full" />
              <Bone className="h-2.5 w-4/5 max-w-[80%]" />
              <Bone className="h-2.5 w-3/5 max-w-[60%]" />
            </div>
          </ShellCard>
        ))}
      </div>
    </div>
  );
}

/** List / table sections (users, vehicles, trips, audit, etc.). */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-5" aria-busy aria-label="Loading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Bone className="h-5 w-36" />
          <Bone className="h-2.5 w-48" />
        </div>
        <Bone className="h-9 w-28 rounded-lg" />
      </div>

      <ShellCard className="overflow-hidden">
        <div className="flex items-center gap-4 border-b border-white/[0.06] px-5 py-3">
          <Bone className="h-3 w-24" />
          <Bone className="h-3 w-20" />
          <Bone className="hidden h-3 w-28 sm:block" />
          <Bone className="ml-auto h-3 w-16" />
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-white/[0.04] px-5 py-4 last:border-0"
          >
            <Bone className="h-9 w-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Bone className={`h-3 ${i % 2 === 0 ? 'w-40' : 'w-32'}`} />
              <Bone className="h-2.5 w-24" />
            </div>
            <Bone className="hidden h-6 w-16 rounded-full sm:block" />
            <Bone className="h-8 w-8 rounded-lg" />
          </div>
        ))}
      </ShellCard>
    </div>
  );
}

/** Generic panel fallback. */
export function PanelSkeleton() {
  return <TableSkeleton rows={5} />;
}
