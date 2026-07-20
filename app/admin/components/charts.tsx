"use client";

import { useEffect, useId, useRef, useState } from 'react';

export type Slice = { label: string; value: number; color: string };

/* Donut with built-in legend — drives off real counts. */
export function Donut({
  data,
  centerValue,
  centerLabel,
  size = 176,
  thickness = 22,
}: {
  data: Slice[];
  centerValue?: React.ReactNode;
  centerLabel?: string;
  size?: number;
  thickness?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  let acc = 0;
  const stops =
    total > 0
      ? data
          .map((d) => {
            const start = (acc / total) * 360;
            acc += d.value;
            const end = (acc / total) * 360;
            return `${d.color} ${start}deg ${end}deg`;
          })
          .join(', ')
      : 'rgba(255,255,255,0.06) 0deg 360deg';

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <div className="h-full w-full rounded-full" style={{ background: `conic-gradient(${stops})` }} />
        <div
          className="absolute rounded-full bg-brand-800"
          style={{ inset: thickness }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerValue !== undefined && (
            <span className="text-2xl font-semibold text-white">{centerValue}</span>
          )}
          {centerLabel && <span className="text-xs text-slate-500">{centerLabel}</span>}
        </div>
      </div>
      <div className="w-full flex-1 space-y-2">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
            <span className="flex-1 text-slate-400">{d.label}</span>
            <span className="font-medium text-slate-200">{d.value}</span>
            <span className="w-10 text-right text-xs text-slate-500">
              {total > 0 ? Math.round((d.value / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Horizontal bar list */
export function BarList({ data }: { data: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-sm text-slate-400" title={d.label}>
            {d.label}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(d.value / max) * 100}%`, background: d.color ?? '#1A52C4' }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-sm font-medium text-slate-200">{d.value}</span>
        </div>
      ))}
      {data.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No data.</p>}
    </div>
  );
}

/* Radial gauge for a single percentage */
export function Gauge({
  value,
  label,
  color = '#1A52C4',
  size = 176,
  thickness = 22,
}: {
  value: number;
  label?: string;
  color?: string;
  size?: number;
  thickness?: number;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const deg = pct * 3.6;
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <div
        className="h-full w-full rounded-full"
        style={{ background: `conic-gradient(${color} 0deg ${deg}deg, rgba(255,255,255,0.06) ${deg}deg 360deg)` }}
      />
      <div className="absolute rounded-full bg-brand-800" style={{ inset: thickness }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold text-white">{pct}%</span>
        {label && <span className="mt-0.5 text-xs text-slate-500">{label}</span>}
      </div>
    </div>
  );
}

/* Smooth area/line chart — measures its real width so it never distorts. */
export function AreaChart({
  data,
  labels,
  color = '#1A52C4',
  height = 150,
}: {
  data: number[];
  labels?: string[];
  color?: string;
  height?: number;
}) {
  const gradId = useId().replace(/:/g, '');
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const W = Math.max(width, 1);
  const H = height;
  const padX = 12;
  const padY = 16;
  const n = data.length;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = n <= 1 ? W / 2 : (i / (n - 1)) * (W - padX * 2) + padX;
    const y = H - padY - (v / max) * (H - padY * 2);
    return [x, y] as const;
  });

  // Smooth curve using Catmull-Rom → cubic Bézier for a polished line.
  const curve = () => {
    if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : '';
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] ?? p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d;
  };
  const line = curve();
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z`;

  return (
    <div ref={ref}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <linearGradient id={`grad-${gradId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        ))}
        <path d={area} fill={`url(#grad-${gradId})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#121212" stroke={color} strokeWidth="2" />
        ))}
      </svg>
      {labels && (
        <div className="mt-2 flex justify-between px-1 text-[11px] text-slate-500">
          {labels.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}
