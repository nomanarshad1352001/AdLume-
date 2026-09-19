import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Building2,
  Check,
  Copy,
  FileText,
  MapPin,
  Plus,
  Quote,
  Search,
  X,
} from "lucide-react";
import { Advertiser, SHOW_MAP, TYPE_META, TYPE_ORDER } from "../data/core";
import { copyText } from "../lib/export";
import { downloadReport } from "../lib/report";
import { relTime } from "../lib/youtube";
import { useApp } from "../state/AppContext";
import { Monogram } from "../components/ui";
import { cn } from "../utils/cn";

/* ----------------------------- alias chip editor ----------------------------- */

function AliasEditor({ advertiser, compact = false }: { advertiser: Advertiser; compact?: boolean }) {
  const { customAliases, addAlias, removeAlias, notify } = useApp();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const custom = customAliases[advertiser.id] ?? [];
  const base = advertiser.aliases.filter((a) => !custom.includes(a));

  const submit = () => {
    const v = draft.trim();
    if (!v) {
      setEditing(false);
      return;
    }
    addAlias(advertiser.id, v);
    notify("Alias added", `“${v}” will match ${advertiser.name} in new analyses.`);
    setDraft("");
    setEditing(false);
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", compact && "gap-1")}>
      {base.map((al) => (
        <span
          key={al}
          className={cn(
            "rounded-full border border-line bg-cream font-medium italic text-ink-soft",
            compact ? "px-2 py-0.5 text-[10.5px]" : "px-2.5 py-1 text-[11px]",
          )}
        >
          “{al}”
        </span>
      ))}
      {custom.map((al) => (
        <span
          key={al}
          className={cn(
            "group/chip inline-flex items-center gap-1 rounded-full border border-dashed border-gold-tint bg-champagne-soft font-medium italic text-gold-deep",
            compact ? "px-2 py-0.5 text-[10.5px]" : "px-2.5 py-1 text-[11px]",
          )}
        >
          “{al}”
          <button
            onClick={() => {
              removeAlias(advertiser.id, al);
              notify("Alias removed", `“${al}”`);
            }}
            className="text-gold-deep/60 transition hover:text-terra"
            aria-label={`Remove alias ${al}`}
            title="Remove alias"
          >
            <X size={11} strokeWidth={3} />
          </button>
        </span>
      ))}
      {editing ? (
        <span className="inline-flex items-center gap-1">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") { setDraft(""); setEditing(false); }
            }}
            onBlur={submit}
            placeholder='e.g. "Feldman Motors"'
            className="w-[130px] rounded-lg border border-gold-tint bg-paper px-2 py-1 text-[11px] italic text-ink outline-none focus:ring-2 focus:ring-gold-bright/25"
          />
        </span>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-dashed border-line bg-transparent font-semibold text-ink-faint transition hover:border-gold-tint hover:text-gold-deep",
            compact ? "px-2 py-0.5 text-[10.5px]" : "px-2.5 py-1 text-[11px]",
          )}
        >
          <Plus size={11} strokeWidth={3} /> alias
        </button>
      )}
    </div>
  );
}

/* --------------------------------- page --------------------------------- */

export default function Advertisers() {
  const { advertisers, mentions, videoMap, statuses, logReport, notify } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const map = new Map<
      string,
      { count: number; videos: Set<string>; lastAt: number; byType: Map<string, number> }
    >();
    mentions.forEach((m) => {
      const cur =
        map.get(m.advertiserId) ?? { count: 0, videos: new Set<string>(), lastAt: 0, byType: new Map() };
      cur.count++;
      cur.videos.add(m.videoId);
      cur.byType.set(m.type, (cur.byType.get(m.type) ?? 0) + 1);
      const at = new Date(videoMap[m.videoId]?.publishedAt ?? 0).getTime();
      if (at > cur.lastAt) cur.lastAt = at;
      map.set(m.advertiserId, cur);
    });
    return map;
  }, [mentions, videoMap]);

  const q = query.trim().toLowerCase();
  const list = advertisers.filter(
    (a) =>
      !q ||
      a.name.toLowerCase().includes(q) ||
      a.aliases.some((al) => al.toLowerCase().includes(q)) ||
      a.industry.toLowerCase().includes(q),
  );

  const copyAliases = async (adv: Advertiser) => {
    const ok = await copyText([adv.name, ...adv.aliases].join("\n"));
    if (ok) {
      setCopiedId(adv.id);
      notify("Alias list copied", `${adv.aliases.length + 1} name variants`);
      window.setTimeout(() => setCopiedId(null), 1500);
    }
  };

  const feldman = list.find((a) => a.id === "feldman");
  const rest = list.filter((a) => a.id !== "feldman");
  const feldmanStats = feldman ? stats.get(feldman.id) : undefined;

  const feldmanReport = () => {
    if (!feldman) return;
    const scoped = mentions.filter((m) => m.advertiserId === "feldman");
    downloadReport(scoped, videoMap, statuses, {
      title: "Feldman Automotive — Mention Report",
      subtitle: `${scoped.length} verified on-air mentions`,
      scope: ["Advertiser: Feldman Automotive", `Alias variants: ${[feldman.name, ...feldman.aliases].join(" · ")}`],
    });
    logReport("html", "Feldman Automotive — Mention Report", scoped.length, [
      "Advertiser: Feldman Automotive",
    ]);
    notify("Feldman report downloaded", "Open it and print to PDF from the browser.");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-2">Directory</div>
          <h1 className="serif-tight text-[clamp(26px,3vw,32px)] font-semibold leading-tight text-ink">
            {advertisers.length} advertisers under watch
          </h1>
          <p className="mt-2 text-[13.5px] text-ink-soft">
            Each brand is tracked by name, alias and phonetic variant. Add your own aliases — new
            analyses pick them up instantly.
          </p>
        </div>
        <div className="relative w-full sm:w-[280px]">
          <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search names & aliases…"
            className="input !py-2.5 !pl-11 !text-[13.5px]"
            aria-label="Search advertisers"
          />
        </div>
      </div>

      {/* --------------------------- feldman wide card --------------------------- */}
      {feldman && feldmanStats && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="card overflow-hidden"
        >
          <div className="grid md:grid-cols-[1.2fr_1fr]">
            <div className="p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Monogram advertiser={feldman} size={54} />
                  <div>
                    <h2 className="serif-tight text-[24px] font-semibold text-ink">{feldman.name}</h2>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-faint">
                      {feldman.industry} · <MapPin size={11} /> {feldman.city}
                    </p>
                  </div>
                </div>
                <span className="hidden rounded-full border border-gold-tint bg-champagne px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gold-deep sm:block">
                  Top partner
                </span>
              </div>

              <div className="mt-5">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-faint">
                  Canonical · matching aliases
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full border border-gold-tint bg-champagne-soft px-2.5 py-1 text-[11px] font-semibold text-gold-deep">
                    {feldman.name}
                  </span>
                  <AliasEditor advertiser={feldman} />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  { v: String(feldmanStats.count), l: "total mentions" },
                  { v: String(feldmanStats.videos.size), l: "episodes covered" },
                  { v: relTime(new Date(feldmanStats.lastAt).toISOString()), l: "last on air" },
                ].map((s) => (
                  <div key={s.l} className="rounded-xl border border-line-soft bg-cream px-4 py-3">
                    <div className="mono text-[20px] font-semibold text-ink">{s.v}</div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{s.l}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button onClick={() => navigate("/mentions?advertiser=feldman")} className="btn-ink !py-2.5 text-[13px]">
                  View every mention <ArrowUpRight size={14} />
                </button>
                <button onClick={feldmanReport} className="btn-ghost !py-2.5 text-[13px]">
                  <FileText size={14} /> Download report
                </button>
                <button
                  onClick={() => copyAliases(feldman)}
                  className="btn-ghost !px-3 !py-2.5"
                  aria-label="Copy alias list"
                  title="Copy alias list"
                >
                  {copiedId === feldman.id ? <Check size={14} className="text-sage" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            <div className="relative hidden min-h-[280px] md:block">
              <img
                src="https://images.pexels.com/photos/29566879/pexels-photo-29566879.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=700&w=980"
                alt="Feldman showroom"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-paper via-paper/30 to-transparent" />
              <div className="absolute bottom-4 right-4 rounded-xl border border-white/50 bg-white/85 px-4 py-2.5 backdrop-blur">
                <div className="mono text-[18px] font-semibold text-ink">{feldmanStats.count}</div>
                <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-ink-faint">verified mentions</div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ------------------------------ rest of the grid ------------------------------ */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rest.map((a, i) => {
          const s = stats.get(a.id);
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.45 }}
              className="card group flex flex-col p-5 transition-shadow hover:shadow-lift"
            >
              <div className="flex items-start gap-3.5">
                <Monogram advertiser={a} size={44} />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[15.5px] font-semibold text-ink">{a.name}</h3>
                  <p className="mt-0.5 truncate text-[11.5px] text-ink-faint">
                    {a.industry} · {a.city}
                  </p>
                </div>
                {s && (
                  <span className="mono rounded-full bg-champagne-soft px-2.5 py-1 text-[12px] font-semibold text-gold-deep">
                    {s.count}
                  </span>
                )}
              </div>

              <div className="mt-3.5 min-h-[26px]">
                <AliasEditor advertiser={a} compact />
              </div>

              {/* type distribution strip */}
              <div className="mt-4">
                <div className="flex h-1.5 overflow-hidden rounded-full bg-line-soft">
                  {TYPE_ORDER.map((t) => {
                    const n = s?.byType.get(t) ?? 0;
                    if (!n || !s) return null;
                    return (
                      <span
                        key={t}
                        className="h-full"
                        style={{ width: `${(n / s.count) * 100}%`, backgroundColor: TYPE_META[t].color }}
                        title={`${TYPE_META[t].label}: ${n}`}
                      />
                    );
                  })}
                </div>
                <div className="mt-2 flex items-center justify-between text-[10.5px] text-ink-faint">
                  <span className="flex items-center gap-1">
                    <Quote size={10} />
                    {s ? `${s.count} mentions · ${s.videos.size} episodes` : "No mentions yet"}
                  </span>
                  {s && <span>{relTime(new Date(s.lastAt).toISOString())}</span>}
                </div>
              </div>

              <div className="mt-auto flex items-center gap-2 pt-4">
                <button
                  onClick={() => navigate(`/mentions?advertiser=${a.id}`)}
                  className="btn-ghost flex-1 !py-2 text-[12.5px] group-hover:border-gold-tint"
                >
                  View mentions <ArrowUpRight size={13} />
                </button>
                <button
                  onClick={() => copyAliases(a)}
                  className="btn-ghost !px-3 !py-2"
                  aria-label="Copy alias list"
                  title="Copy alias list"
                >
                  {copiedId === a.id ? <Check size={14} className="text-sage" /> : <Copy size={14} />}
                </button>
              </div>
            </motion.div>
          );
        })}
        {list.length === 0 && (
          <div className="card col-span-full flex items-center gap-3 px-6 py-10 text-ink-soft">
            <Building2 size={18} className="text-ink-faint" />
            Nothing matches “{query}” — try a canonical name like Feldman Automotive.
          </div>
        )}
      </div>

      {/* footer hint */}
      <div className="card flex flex-wrap items-center gap-3 border-gold-tint/50 bg-champagne-soft px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold text-white">
          <Search size={15} />
        </span>
        <p className="flex-1 text-[12.5px] leading-relaxed text-ink-soft">
          <span className="font-semibold text-ink">Missing a name variant?</span> Aliases you add here (like{" "}
          {SHOW_MAP["drive-home"].name} sponsor nicknames) are saved to this workspace and used by every
          new analysis.
        </p>
        <button onClick={() => navigate("/analyze")} className="btn-gold !py-2.5 text-[12.5px]">
          Run a fresh analysis
        </button>
      </div>
    </div>
  );
}
