"use client";

/** Animated cargo corridor map — used on landing + auth pages. */
export function FleetVisual({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`relative h-full w-full overflow-hidden bg-brand-900 ${compact ? 'min-h-full' : 'min-h-full'}`}>
      <div className="pointer-events-none absolute inset-0 animate-drift">
        <div className="absolute -left-1/4 top-0 h-[70%] w-[70%] rounded-full bg-brand-700/35 blur-[100px]" />
        <div className="absolute -right-1/4 bottom-0 h-[60%] w-[60%] rounded-full bg-brand-500/25 blur-[110px]" />
      </div>

      <svg className="absolute inset-0 h-full w-full opacity-[0.14]" aria-hidden>
        <defs>
          <pattern id="cf-grid" width="56" height="56" patternUnits="userSpaceOnUse">
            <path d="M 56 0 L 0 0 0 56" fill="none" stroke="#0045DD" strokeWidth="0.7" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cf-grid)" />
      </svg>

      <svg
        viewBox="0 0 800 560"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        {/* freight corridors */}
        <path
          className="route-path"
          d="M60 440 C160 400, 210 300, 300 270 S470 290, 540 190 S650 90, 740 120"
          fill="none"
          stroke="#0045DD"
          strokeWidth="2.5"
          strokeLinecap="round"
          pathLength={1}
        />
        <path
          className="route-path"
          style={{ animationDelay: '0.55s' }}
          d="M40 180 C150 210, 230 250, 340 230 S510 150, 600 270 S700 400, 760 360"
          fill="none"
          stroke="#3D6AE8"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeOpacity="0.7"
          pathLength={1}
        />
        <path
          className="route-path"
          style={{ animationDelay: '1s' }}
          d="M100 500 C250 480, 380 420, 480 360 S620 280, 700 300"
          fill="none"
          stroke="#002C8F"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeOpacity="0.85"
          pathLength={1}
        />

        {/* yard / depot hubs */}
        <g className="animate-pin-pop" style={{ animationDelay: '0.85s', opacity: 0 }}>
          <rect x="48" y="420" width="36" height="28" rx="4" fill="#002C8F" />
          <text x="66" y="438" textAnchor="middle" fill="#F4F6FB" fontSize="8" fontFamily="system-ui">
            YARD
          </text>
        </g>
        <g className="animate-pin-pop" style={{ animationDelay: '1.15s', opacity: 0 }}>
          <circle cx="740" cy="120" r="18" fill="#002C8F" />
          <circle cx="740" cy="120" r="6" fill="#F4F6FB" />
        </g>
        <g className="animate-pin-pop" style={{ animationDelay: '1.35s', opacity: 0 }}>
          <circle cx="760" cy="360" r="14" fill="#0045DD" />
          <circle cx="760" cy="360" r="5" fill="#010000" />
        </g>

        {/* truck marker on corridor */}
        <g className="animate-float">
          <circle cx="380" cy="255" r="28" fill="#0045DD" opacity="0.2" className="animate-pulse-soft" />
          <g transform="translate(358, 242)">
            <rect x="0" y="6" width="28" height="14" rx="2" fill="#F4F6FB" />
            <rect x="28" y="10" width="12" height="10" rx="1.5" fill="#C5D0F5" />
            <circle cx="8" cy="22" r="3.5" fill="#010000" />
            <circle cx="32" cy="22" r="3.5" fill="#010000" />
          </g>
        </g>

        {/* cargo label */}
        {!compact && (
          <g className="animate-pin-pop" style={{ animationDelay: '1.5s', opacity: 0 }}>
            <text x="520" y="160" fill="#8FA3EB" fontSize="11" fontFamily="system-ui" letterSpacing="1.5">
              LOAD · I-80 WEST
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
