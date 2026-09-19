/** YouTube URL utilities + small formatters. */

export interface ParsedYouTube {
  id: string;
  start?: number;
}

const ID_RE = /^[A-Za-z0-9_-]{11}$/;

function parseStart(t: string | null): number | undefined {
  if (!t) return undefined;
  if (/^\d+$/.test(t)) return parseInt(t, 10);
  let sec = 0;
  const h = /(\d+)h/.exec(t); if (h) sec += parseInt(h[1]) * 3600;
  const m = /(\d+)m/.exec(t); if (m) sec += parseInt(m[1]) * 60;
  const s = /(\d+)s/.exec(t); if (s) sec += parseInt(s[1]);
  return sec > 0 ? sec : undefined;
}

export function parseYouTubeUrl(raw: string): ParsedYouTube | null {
  let s = raw.trim();
  if (!s) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = "https://" + s;
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^(www\.|m\.|music\.)/, "");
    let id: string | null = null;
    if (host === "youtu.be") {
      id = u.pathname.slice(1).split("/")[0];
    } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (u.pathname === "/watch") id = u.searchParams.get("v");
      else {
        const mm = /^\/(shorts|live|embed|v)\/([A-Za-z0-9_-]{6,})/.exec(u.pathname);
        if (mm) id = mm[2];
      }
    }
    if (!id || !ID_RE.test(id)) return null;
    const start =
      parseStart(u.searchParams.get("t")) ?? parseStart(u.searchParams.get("start"));
    return { id, start };
  } catch {
    return null;
  }
}

export const watchUrl = (id: string, t?: number): string =>
  `https://www.youtube.com/watch?v=${id}${t && t > 0 ? `&t=${Math.floor(t)}s` : ""}`;

export const ytThumb = (id: string): string =>
  `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

export function fmtTime(total: number): string {
  const s = Math.max(0, Math.floor(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? h + ":" : ""}${mm}:${String(sec).padStart(2, "0")}`;
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return mo === 1 ? "1 mo ago" : `${mo} mo ago`;
}

export function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString();
}
