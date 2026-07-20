"use client";

import Link from 'next/link';
import { type ReactNode } from 'react';
import { FleetVisual } from './FleetVisual';

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Left-panel headline for cargo branding */
  panelTitle?: string;
  panelBody?: string;
};

/**
 * Shared animated shell for login / signup / forgot-password.
 * Split layout: cargo corridor visual + staggered form entrance.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  panelTitle = 'Move freight with clarity',
  panelBody = 'Track loads, drivers, and yards in one multi-tenant cargo SaaS — built for logistics companies.',
}: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen bg-brand-900 text-slate-200">
      {/* Left: cargo visual */}
      <aside className="relative hidden w-[46%] overflow-hidden lg:block">
        <FleetVisual compact />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-950/95 via-brand-950/40 to-transparent" />
        <div
          className="absolute inset-x-0 bottom-0 p-10 opacity-0 animate-fade-up xl:p-14"
          style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}
        >
          <p className="font-display text-xs font-semibold tracking-[0.22em] text-brand-400 uppercase">FleetFlow</p>
          <h2 className="mt-3 max-w-sm font-display text-3xl font-semibold leading-tight tracking-tight text-white">
            {panelTitle}
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/60">{panelBody}</p>
          <div className="mt-8 flex gap-6 text-xs text-brand-300/80">
            <span>Live corridors</span>
            <span>Yard · road · door</span>
            <span>Role-based</span>
          </div>
        </div>
      </aside>

      {/* Right: form */}
      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-14 sm:px-8">
        <div className="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-brand-500/10 blur-[100px] animate-drift" />
        <div
          className="pointer-events-none absolute -left-16 bottom-0 h-72 w-72 rounded-full bg-brand-700/20 blur-[100px] animate-drift"
          style={{ animationDelay: '-7s' }}
        />

        {/* mobile-only soft visual */}
        <div className="pointer-events-none absolute inset-0 opacity-40 lg:hidden">
          <FleetVisual compact />
          <div className="absolute inset-0 bg-brand-950/85" />
        </div>

        <div className="relative w-full max-w-md">
          <div
            className="mb-8 opacity-0 animate-fade-up"
            style={{ animationDelay: '60ms', animationFillMode: 'forwards' }}
          >
            <Link href="/" className="inline-flex items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo-dark.png" alt="FleetFlow" className="h-14 w-auto object-contain" />
            </Link>
            <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-white">{title}</h1>
            <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
          </div>

          <div
            className="rounded-2xl border border-white/[0.07] bg-brand-800/75 p-7 shadow-2xl backdrop-blur-md opacity-0 animate-fade-up sm:p-8"
            style={{ animationDelay: '180ms', animationFillMode: 'forwards' }}
          >
            {children}
          </div>

          {footer && (
            <div
              className="mt-6 text-center text-sm text-slate-500 opacity-0 animate-fade-up"
              style={{ animationDelay: '320ms', animationFillMode: 'forwards' }}
            >
              {footer}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
