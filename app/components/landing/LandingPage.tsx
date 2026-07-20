"use client";

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { FleetVisual } from './FleetVisual';
import { Reveal, useScrollY } from './Reveal';
import { TruckLoader } from './TruckLoader';

const FEATURES = [
  {
    title: 'Live load tracking',
    body: 'Watch every truck, trailer, and shipment move from yard to door — status, speed, and ETA in one view.',
  },
  {
    title: 'Dispatch that keeps up',
    body: 'Assign corridors, re-route delayed loads, and keep drivers and customers aligned without phone chaos.',
  },
  {
    title: 'Your company, sealed',
    body: 'True multi-tenant cargo SaaS. Fleets, drivers, trips, SMTP, and audit logs stay inside your company.',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Register your carrier',
    body: 'Create a company account. You become the owner with full control of the fleet workspace.',
  },
  {
    n: '02',
    title: 'Staff the operation',
    body: 'Invite dispatchers, fleet managers, drivers, maintenance, finance, and support — each with their role.',
  },
  {
    n: '03',
    title: 'Move cargo daily',
    body: 'Plan trips, track vehicles, monitor yards, and report on-time delivery from web or mobile.',
  },
];

const CARGO_LINES = [
  { label: 'Outbound', detail: 'Port → regional DC' },
  { label: 'Linehaul', detail: 'Hub ↔ hub overnight' },
  { label: 'Last mile', detail: 'DC → consignee door' },
];

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [booting, setBooting] = useState(true);
  const scrollY = useScrollY();

  const finishBoot = useCallback(() => setBooting(false), []);

  useEffect(() => {
    setScrolled(scrollY > 24);
  }, [scrollY]);

  const heroShift = Math.min(scrollY * 0.28, 140);
  const heroFade = Math.max(1 - scrollY / 520, 0.35);

  return (
    <div className="min-h-screen bg-brand-50 text-brand-900">
      {booting && <TruckLoader onDone={finishBoot} />}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'border-b border-brand-900/5 bg-brand-50/90 text-brand-900 backdrop-blur-xl'
            : 'bg-transparent text-white'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:h-20 md:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                scrolled
                  ? '/11light%20logo%20text-Photoroom.png'
                  : '/11logo%20text-Photoroom.png'
              }
              alt="FleetFlow"
              className="h-10 w-auto object-contain md:h-11"
            />
          </Link>
          <nav
            className={`hidden items-center gap-8 text-sm font-medium md:flex ${
              scrolled ? 'text-brand-700' : 'text-white/70'
            }`}
          >
            <a href="#product" className={`transition ${scrolled ? 'hover:text-brand-900' : 'hover:text-white'}`}>
              Product
            </a>
            <a href="#corridors" className={`transition ${scrolled ? 'hover:text-brand-900' : 'hover:text-white'}`}>
              Corridors
            </a>
            <a href="#how" className={`transition ${scrolled ? 'hover:text-brand-900' : 'hover:text-white'}`}>
              How it works
            </a>
            <a href="#roles" className={`transition ${scrolled ? 'hover:text-brand-900' : 'hover:text-white'}`}>
              Roles
            </a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/admin/login"
              className={`rounded-full px-3 py-2 text-sm font-medium transition sm:px-4 ${
                scrolled ? 'text-brand-700 hover:text-brand-900' : 'text-white/80 hover:text-white'
              }`}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                scrolled
                  ? 'bg-brand-900 text-brand-50 hover:bg-brand-800'
                  : 'bg-white text-brand-900 hover:bg-brand-50'
              }`}
            >
              Create account
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-[100svh] overflow-hidden">
        <div
          className="absolute inset-0 will-change-transform"
          style={{ transform: `translate3d(0, ${heroShift * 0.35}px, 0) scale(${1 + scrollY / 8000})` }}
        >
          <FleetVisual />
        </div>
        <div
          className="absolute inset-0 bg-gradient-to-r from-brand-950/95 via-brand-950/75 to-brand-950/20 md:via-brand-950/55 md:to-transparent"
          style={{ opacity: heroFade }}
        />

        <div
          className="relative mx-auto flex min-h-[100svh] max-w-6xl items-center px-5 pb-28 pt-28 md:px-8 md:pt-32"
          style={{
            transform: `translate3d(0, ${heroShift * 0.15}px, 0)`,
            opacity: Math.max(1 - scrollY / 480, 0),
          }}
        >
          <div
            className="max-w-xl opacity-0 animate-fade-up"
            style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
          >
            <p className="font-display text-sm font-semibold tracking-[0.22em] text-brand-400 uppercase">
              Cargo · Fleet · SaaS
            </p>
            <h1 className="mt-5 font-display text-[2.75rem] font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-[3.5rem]">
              Cargo on the road,
              <br />
              under control.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/65 sm:text-lg">
              CargoFlow is the multi-tenant platform for carriers and logistics teams — vehicles, drivers, loads, and
              yards in one system.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-400"
              >
                Start your fleet
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
              <a
                href="#product"
                className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:border-white/35 hover:bg-white/10"
              >
                Explore cargo tools
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Product */}
      <section id="product" className="border-t border-brand-900/5 bg-white/50 py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <Reveal>
            <p className="font-display text-sm font-semibold tracking-[0.18em] text-brand-500 uppercase">Product</p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight text-brand-900 sm:text-4xl">
              Built for cargo companies — not generic dashboards.
            </h2>
            <p className="mt-4 max-w-xl text-brand-700/75">
              From private fleets to 3PLs: run outbound, linehaul, and last-mile with roles that match the yard and the
              cab.
            </p>
          </Reveal>

          <div className="mt-16 grid gap-12 md:grid-cols-3 md:gap-10">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 90}>
                <div className="border-t border-brand-900/10 pt-6">
                  <h3 className="font-display text-xl font-semibold text-brand-900">{f.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-brand-700/70">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Corridors */}
      <section id="corridors" className="py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <Reveal>
            <p className="font-display text-sm font-semibold tracking-[0.18em] text-brand-500 uppercase">Corridors</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Every mile of the load.
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-0 border-t border-brand-900/10 md:grid-cols-3">
            {CARGO_LINES.map((line, i) => (
              <Reveal key={line.label} delay={i * 100}>
                <div className="border-b border-brand-900/10 py-10 md:border-b-0 md:border-r md:border-brand-900/10 md:px-8 md:py-12 last:md:border-r-0 first:md:pl-0">
                  <p className="font-display text-sm font-semibold tracking-wider text-brand-500 uppercase">
                    {line.label}
                  </p>
                  <p className="mt-3 font-display text-2xl font-semibold text-brand-900">{line.detail}</p>
                  <p className="mt-3 text-sm text-brand-700/65">
                    Plan the trip, assign the driver, watch the load — then close the loop with on-time reports.
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-brand-900/5 bg-white/40 py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <Reveal>
            <p className="font-display text-sm font-semibold tracking-[0.18em] text-brand-500 uppercase">How it works</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              From signup to first load.
            </h2>
          </Reveal>

          <div className="mt-16 space-y-0">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 70}>
                <div className="grid items-baseline gap-4 border-t border-brand-900/10 py-8 md:grid-cols-[5rem_1fr_1.2fr] md:gap-10">
                  <span className="font-display text-sm font-semibold text-brand-500">{s.n}</span>
                  <h3 className="font-display text-xl font-semibold text-brand-900">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-brand-700/70 md:text-base">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="bg-brand-900 py-24 text-brand-50 md:py-32">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <Reveal>
            <p className="font-display text-sm font-semibold tracking-[0.18em] text-brand-400 uppercase">Access</p>
            <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              The right cab for every seat.
            </h2>
            <p className="mt-4 max-w-lg text-brand-300/80">
              Super admins run the SaaS. Company owners run the carrier. Dispatch, drivers, and finance only see what
              their job needs.
            </p>
          </Reveal>

          <Reveal delay={100}>
            <p className="mt-12 max-w-3xl font-display text-2xl font-medium leading-snug text-brand-200 sm:text-3xl">
              Super Admin · Owner · Fleet · Dispatch · Drivers · Maintenance · Finance · Support · Driver · Customer
            </p>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-64 w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-200/40 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-3xl px-5 text-center md:px-8">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">
              Ready to move cargo clearer?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-brand-700/75">
              Create a carrier account, invite your team, and open the admin console. Same login works on the mobile
              app.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex rounded-full bg-brand-900 px-7 py-3.5 text-sm font-semibold text-brand-50 transition hover:bg-brand-800"
              >
                Create account
              </Link>
              <Link
                href="/admin/login"
                className="inline-flex rounded-full border border-brand-900/15 px-7 py-3.5 text-sm font-semibold text-brand-800 transition hover:border-brand-900/30"
              >
                Open admin
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-brand-900/8 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 sm:flex-row sm:items-center md:px-8">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-light.png" alt="FleetFlow" className="h-12 w-auto object-contain" />
          </div>
          <p className="text-xs text-brand-700/50">© {new Date().getFullYear()} FleetFlow. Built for carriers.</p>
          <div className="flex gap-5 text-xs font-medium text-brand-700/70">
            <Link href="/admin/login" className="hover:text-brand-900">
              Admin
            </Link>
            <Link href="/signup" className="hover:text-brand-900">
              Sign up
            </Link>
            <a href="/api/health" className="hover:text-brand-900">
              Health
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
