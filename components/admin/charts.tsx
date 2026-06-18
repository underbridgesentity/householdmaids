import { ReactNode } from "react";

/* Lightweight, premium SVG charts — server-renderable, no client deps. */

function ids(prefix: string) {
  // Deterministic gradient id from the data signature (no Math.random in render).
  return prefix;
}

/** Tiny inline sparkline (area + line) used inside KPI tiles. */
export function Sparkline({ data, color = "#A22D8F", className = "" }: { data: number[]; color?: string; className?: string }) {
  const w = 120, h = 36;
  const pts = data.length ? data : [0, 0];
  const min = Math.min(...pts), max = Math.max(...pts);
  const span = max - min || 1;
  const coords = pts.map((v, i) => {
    const x = pts.length === 1 ? w : (i / (pts.length - 1)) * w;
    const y = h - 3 - ((v - min) / span) * (h - 8);
    return [x, y] as const;
  });
  const line = coords.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  const gid = ids("spark" + Math.round(span));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={`h-9 w-full ${className}`}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** A KPI tile: label, big value, delta, optional sparkline + accent bar. */
export function StatTile({
  label, value, sub, spark, sparkColor, accent = "indigo", icon,
}: {
  label: string; value: string; sub?: string; spark?: number[]; sparkColor?: string;
  accent?: "indigo" | "magenta" | "orange" | "money"; icon?: ReactNode;
}) {
  const accents: Record<string, string> = {
    indigo: "#4A2C7C", magenta: "#A22D8F", orange: "#F2960E", money: "#1F9D63",
  };
  const c = accents[accent];
  return (
    <div className="relative overflow-hidden rounded-[16px] border border-line bg-white p-4 shadow-[0_1px_2px_rgba(60,33,104,.04),0_8px_24px_-16px_rgba(60,33,104,.18)]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[.07em] text-muted-label">{label}</span>
        {icon && <span style={{ color: c }} className="opacity-80">{icon}</span>}
      </div>
      <div className="mt-2 font-display text-[26px] font-extrabold tabular-nums tracking-tight text-ink">{value}</div>
      {sub && <div className="mt-0.5 text-[12px] font-semibold text-muted">{sub}</div>}
      {spark && (
        <div className="mt-2 -mx-1">
          <Sparkline data={spark} color={sparkColor ?? c} />
        </div>
      )}
      <span className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${c}, transparent 85%)` }} />
    </div>
  );
}

/** A larger area chart with gradient fill, soft gridlines and x-axis labels. */
export function AreaChart({
  data, color = "#4A2C7C", height = 200,
}: {
  data: { label: string; value: number }[]; color?: string; height?: number;
}) {
  const w = 760, h = height;
  const padB = 26, padT = 12;
  const max = Math.max(1, ...data.map((d) => d.value));
  const coords = data.map((d, i) => {
    const x = data.length === 1 ? w / 2 : (i / (data.length - 1)) * w;
    const y = padT + (1 - d.value / max) * (h - padB - padT);
    return [x, y] as const;
  });
  const line = coords.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w} ${h - padB} L0 ${h - padB} Z`;
  const grid = [0.25, 0.5, 0.75, 1].map((f) => padT + f * (h - padB - padT));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {grid.map((y, i) => (
        <line key={i} x1="0" y1={y} x2={w} y2={y} stroke="#ece6f3" strokeWidth="1" strokeDasharray="2 4" />
      ))}
      <path d={area} fill="url(#areaFill)" />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill="#fff" stroke={color} strokeWidth="2" />
      ))}
      {data.map((d, i) => {
        const x = data.length === 1 ? w / 2 : (i / (data.length - 1)) * w;
        return (
          <text key={i} x={x} y={h - 8} textAnchor="middle" className="fill-muted-faint" style={{ fontSize: 11, fontWeight: 600 }}>{d.label}</text>
        );
      })}
    </svg>
  );
}
