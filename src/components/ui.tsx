import { type ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { Advertiser, MentionType, TYPE_META } from "../data/core";
import { splitOnTerm } from "../data/generator";
import { cn } from "../utils/cn";

/* ------------------------------ mention type ------------------------------- */

export function TypeBadge({ type, className }: { type: MentionType; className?: string }) {
  const meta = TYPE_META[type];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.08em]",
        className,
      )}
      style={{ backgroundColor: meta.soft, color: meta.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
      {meta.label}
    </span>
  );
}

/* ------------------------------- monogram tile ----------------------------- */

export function Monogram({
  advertiser,
  size = 40,
  className,
}: {
  advertiser: Advertiser;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("flex shrink-0 items-center justify-center rounded-xl", className)}
      style={{
        width: size,
        height: size,
        backgroundColor: `${advertiser.color}1A`,
        color: advertiser.color,
        boxShadow: `inset 0 0 0 1px ${advertiser.color}33`,
        fontFamily: "var(--font-display)",
        fontSize: size * 0.36,
        fontWeight: 600,
        letterSpacing: "0.02em",
      }}
    >
      {advertiser.monogram}
    </span>
  );
}

/* ------------------------------- confidence -------------------------------- */

export function ConfidenceMeter({ value, className }: { value: number; className?: string }) {
  const pct = Math.round(value * 100);
  return (
    <span className={cn("inline-flex items-center gap-2", className)} title={`${pct}% match confidence`}>
      <span className="h-1 w-12 overflow-hidden rounded-full bg-line-soft">
        <span
          className="block h-full rounded-full"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg,#DFC594,#A8763E)" }}
        />
      </span>
      <span className="mono text-[11px] font-medium text-ink-faint">{pct}%</span>
    </span>
  );
}

/* --------------------------- highlight matched term ------------------------ */

export function Highlight({ text, term, strong = true }: { text: string; term: string; strong?: boolean }) {
  const parts = splitOnTerm(text, term);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts[0]}
      <mark className={strong ? "hl" : "hl-soft"}>{parts[1]}</mark>
      {parts[2]}
    </>
  );
}

/* -------------------------------- sections --------------------------------- */

export function SectionHead({
  eyebrow,
  title,
  action,
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex items-end justify-between gap-4", className)}>
      <div>
        <div className="eyebrow mb-2">{eyebrow}</div>
        <h2 className="serif-tight text-[26px] font-semibold leading-tight text-ink">{title}</h2>
      </div>
      {action}
    </div>
  );
}

/* ------------------------------- empty state ------------------------------- */

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center px-8 py-14 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-champagne-soft text-gold-deep">
        <Icon size={22} strokeWidth={1.8} />
      </span>
      <h3 className="serif-tight text-xl font-semibold text-ink">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* --------------------------------- select ---------------------------------- */

export function FancySelect({
  value,
  onChange,
  options,
  className,
  icon: Icon,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  icon?: LucideIcon;
  ariaLabel?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      {Icon && (
        <Icon
          size={14}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
        />
      )}
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full cursor-pointer appearance-none rounded-xl border border-line bg-paper py-2.5 pl-9 pr-9 text-[13px] font-semibold text-ink-soft outline-none transition hover:border-gold-tint focus:border-gold-bright focus:ring-4 focus:ring-gold-bright/15",
          !Icon && "pl-4",
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint"
      />
    </div>
  );
}

/* -------------------------------- sparkline -------------------------------- */

export function Sparkline({
  points,
  width = 96,
  height = 30,
  className,
}: {
  points: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  if (points.length < 2) return null;
  const max = Math.max(...points, 1);
  const stepX = width / (points.length - 1);
  const coords = points.map((p, i) => [i * stepX, height - 4 - (p / max) * (height - 8)] as const);
  const d = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${d} L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      <path d={area} fill="url(#sparkfill)" opacity={0.5} />
      <defs>
        <linearGradient id="sparkfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C9A24B" stopOpacity={0.5} />
          <stop offset="100%" stopColor="#C9A24B" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke="#A8763E" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
