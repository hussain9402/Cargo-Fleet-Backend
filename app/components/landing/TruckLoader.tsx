"use client";

import { useEffect, useState } from 'react';

/** Full-screen load feel: truck drives left → right above the road, then exits. */
export function TruckLoader({ onDone }: { onDone?: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const driveMs = reduce ? 400 : 1800;
    const fadeMs = reduce ? 200 : 450;

    const doneTimer = window.setTimeout(() => {
      setLeaving(true);
      window.setTimeout(() => onDone?.(), fadeMs);
    }, driveMs);

    return () => window.clearTimeout(doneTimer);
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-brand-900 transition-opacity duration-500 ${
        leaving ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      aria-live="polite"
      aria-busy={!leaving}
      role="status"
    >
      <p className="sr-only">Loading</p>

      <div className="relative w-full max-w-lg px-8">
        {/* truck above the line */}
        <div className="relative h-16 overflow-visible">
          <div className="absolute bottom-0 animate-truck-drive will-change-transform">
            <TruckMark />
          </div>
        </div>

        {/* road */}
        <div className="relative mt-1 h-0.5 overflow-hidden bg-white/15">
          <div className="absolute inset-y-0 left-0 w-full animate-road-dash bg-[repeating-linear-gradient(90deg,transparent_0,transparent_12px,#0045DD_12px,#0045DD_22px)] opacity-80" />
        </div>
      </div>
    </div>
  );
}

function TruckMark() {
  return (
    <svg width="112" height="56" viewBox="0 0 56 28" fill="none" aria-hidden className="block drop-shadow-lg">
      {/* trailer */}
      <rect x="2" y="6" width="30" height="14" rx="2" fill="#F4F6FB" />
      <rect x="4" y="8" width="10" height="6" rx="1" fill="#0045DD" opacity="0.35" />
      <rect x="16" y="8" width="10" height="6" rx="1" fill="#0045DD" opacity="0.35" />
      {/* cab */}
      <path d="M32 10h10.5c1.2 0 2.2.7 2.6 1.8L48 18H32V10Z" fill="#0045DD" />
      <rect x="34" y="11.5" width="6" height="5" rx="1" fill="#C5D0F5" />
      {/* wheels */}
      <circle cx="12" cy="22" r="4" fill="#010000" stroke="#8FA3EB" strokeWidth="1.5" />
      <circle cx="12" cy="22" r="1.5" fill="#8FA3EB" />
      <circle cx="26" cy="22" r="4" fill="#010000" stroke="#8FA3EB" strokeWidth="1.5" />
      <circle cx="26" cy="22" r="1.5" fill="#8FA3EB" />
      <circle cx="42" cy="22" r="4" fill="#010000" stroke="#8FA3EB" strokeWidth="1.5" />
      <circle cx="42" cy="22" r="1.5" fill="#8FA3EB" />
    </svg>
  );
}
