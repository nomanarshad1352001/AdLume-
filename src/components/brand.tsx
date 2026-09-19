import { IMG } from "../data/core";
import { cn } from "../utils/cn";

export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <rect width="44" height="44" rx="12" fill="#211A13" />
      <defs>
        <linearGradient id="lm-g" x1="10" y1="8" x2="34" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D9B87C" />
          <stop offset="0.55" stopColor="#C9A24B" />
          <stop offset="1" stopColor="#A8763E" />
        </linearGradient>
      </defs>
      <path d="M22 7.5L35 22L22 36.5L9 22L22 7.5Z" fill="url(#lm-g)" />
      <path d="M22 15.4L28.6 22L22 28.6L15.4 22L22 15.4Z" fill="#211A13" />
      <circle cx="22" cy="22" r="1.7" fill="url(#lm-g)" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("leading-none", className)}>
      <div className="serif-tight text-[21px] font-semibold text-ink">
        Ad<span className="italic font-medium">Lume</span>
      </div>
      <div className="mt-1 text-[8.5px] font-semibold uppercase tracking-[0.3em] text-ink-faint">
        Mention Intelligence
      </div>
    </div>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoMark />
      <Wordmark />
    </div>
  );
}

export function Avatar({
  name,
  src,
  size = 36,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full border border-line bg-champagne",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
          onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
        />
      ) : null}
      <span
        className="absolute inset-0 flex items-center justify-center font-mono text-[11px] font-semibold text-gold-deep"
        style={{ zIndex: -1 }}
      >
        {initials}
      </span>
    </div>
  );
}

export const USER_AVATAR = IMG.avatar;
