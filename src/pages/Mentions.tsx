import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  Building2,
  Calendar,
  CheckSquare2,
  Download,
  FileJson,
  FileText,
  Filter,
  Flag,
  Link2,
  Quote,
  RotateCcw,
  Scissors,
  Search,
  Square,
  X,
} from "lucide-react";
import {
  ADVERTISER_MAP,
  MentionType,
  SHOWS,
  TYPE_META,
  TYPE_ORDER,
  VideoItem,
} from "../data/core";
import { clipsFromMentions, downloadClipPackage } from "../lib/clips";
import { copyText, download, mentionsToRows, toCsv, toJson } from "../lib/export";
import { downloadReport } from "../lib/report";
import { fmtDate, watchUrl } from "../lib/youtube";
import { useApp } from "../state/AppContext";
import { EmptyState, FancySelect } from "../components/ui";
import { MentionCard } from "../components/MentionCard";
import { cn } from "../utils/cn";

type StatusFilter = "all" | "unreviewed" | "verified" | "flagged";

const STATUS_VARIANTS: StatusFilter[] = ["unreviewed", "verified", "flagged"];

export default function Mentions() {
  const {
    mentions,
    advertisers,
    videoMap,
    statuses,
    setMentionStatus,
    logReport,
    notify,
  } = useApp();
  const [params] = useSearchParams();

  const initialStatus = params.get("status");
  const [query, setQuery] = useState("");
  const [advId, setAdvId] = useState<string | null>(params.get("advertiser"));
  const [videoId] = useState<string | null>(params.get("video"));
  const [showId, setShowId] = useState<string>(params.get("show") ?? "all");
  const [types, setTypes] = useState<Set<MentionType>>(new Set());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    STATUS_VARIANTS.includes(initialStatus as StatusFilter)
      ? (initialStatus as StatusFilter)
      : "all",
  );
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [zipping, setZipping] = useState(false);

  const toggleType = (t: MentionType) =>
    setTypes((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mentions
      .filter((m) => {
        const v: VideoItem | undefined = videoMap[m.videoId];
        const adv = ADVERTISER_MAP[m.advertiserId];
        if (advId && m.advertiserId !== advId) return false;
        if (videoId && m.videoId !== videoId) return false;
        if (showId !== "all" && v?.showId !== showId) return false;
        if (types.size && !types.has(m.type)) return false;
        const st = statuses[m.id];
        if (statusFilter === "unreviewed" && st) return false;
        if (statusFilter === "verified" && st !== "verified") return false;
        if (statusFilter === "flagged" && st !== "flagged") return false;
        if (from && v && new Date(v.publishedAt) < new Date(from)) return false;
        if (to && v) {
          const end = new Date(to);
          end.setHours(23, 59, 59);
          if (new Date(v.publishedAt) > end) return false;
        }
        if (q) {
          const hay = [
            adv?.name,
            ...(adv?.aliases ?? []),
            m.matchedText,
            m.line.text,
            v?.title,
            v ? SHOWS.find((s) => s.id === v.showId)?.name : "",
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const da = new Date(videoMap[a.videoId]?.publishedAt ?? 0).getTime();
        const db = new Date(videoMap[b.videoId]?.publishedAt ?? 0).getTime();
        return db - da || a.tStart - b.tStart;
      });
  }, [mentions, videoMap, statuses, query, advId, videoId, showId, types, statusFilter, from, to]);

  const videoCount = new Set(filtered.map((m) => m.videoId)).size;
  const statusCounts = useMemo(() => {
    let v = 0;
    let f = 0;
    Object.values(statuses).forEach((s) => {
      if (s === "verified") v++;
      if (s === "flagged") f++;
    });
    return { verified: v, flagged: f, unreviewed: mentions.length - v - f };
  }, [statuses, mentions.length]);

  const activeFilters =
    query || advId || videoId || showId !== "all" || types.size > 0 || statusFilter !== "all" || from || to;

  const clearAll = () => {
    setQuery("");
    setAdvId(null);
    setShowId("all");
    setTypes(new Set());
    setStatusFilter("all");
    setFrom("");
    setTo("");
  };

  const scopeLines = useMemo(() => {
    const lines: string[] = [];
    lines.push(advId ? `Advertiser: ${ADVERTISER_MAP[advId]?.name}` : "Advertisers: all");
    lines.push(showId === "all" ? "Shows: all" : `Show: ${SHOWS.find((s) => s.id === showId)?.name}`);
    if (from || to) lines.push(`Range: ${from ? fmtDate(from) : "…"} → ${to ? fmtDate(to) : "…"}`);
    if (types.size) lines.push(`Types: ${[...types].map((t) => TYPE_META[t].label).join(", ")}`);
    if (statusFilter !== "all") lines.push(`Review: ${statusFilter}`);
    if (query) lines.push(`Query: “${query}”`);
    return lines;
  }, [advId, showId, from, to, types, statusFilter, query]);

  /* ------------------------------ selection ------------------------------ */

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const visibleIds = filtered.map((m) => m.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  const toggleSelectVisible = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });

  const selectedMentions = useMemo(
    () => mentions.filter((m) => selected.has(m.id)),
    [mentions, selected],
  );

  /* ------------------------------- exports ------------------------------- */

  const date = new Date().toISOString().slice(0, 10);

  const doExportCsv = () => {
    download(`adlume-mentions-${date}.csv`, toCsv(mentionsToRows(filtered, videoMap, statuses)), "text/csv");
    logReport("csv", "Mention Explorer — CSV", filtered.length, scopeLines);
    notify("CSV report downloaded", `${filtered.length} rows exported`);
    setExportOpen(false);
  };
  const doExportJson = () => {
    download(`adlume-mentions-${date}.json`, toJson(mentionsToRows(filtered, videoMap, statuses)), "application/json");
    logReport("json", "Mention Explorer — JSON", filtered.length, scopeLines);
    notify("JSON report downloaded", `${filtered.length} records exported`);
    setExportOpen(false);
  };
  const doReport = () => {
    downloadReport(filtered, videoMap, statuses, {
      title: advId ? `${ADVERTISER_MAP[advId]?.name} — Mention Report` : "Mention Report",
      subtitle: `${filtered.length} mentions across ${videoCount} episodes`,
      scope: scopeLines,
    });
    logReport("html", advId ? `${ADVERTISER_MAP[advId]?.name} — Mention Report` : "Mention Report", filtered.length, scopeLines);
    notify("HTML report downloaded", "Open it and print to PDF from the browser.");
    setExportOpen(false);
  };
  const doCopyLinks = async () => {
    const ok = await copyText(filtered.map((m) => watchUrl(m.videoId, m.tStart)).join("\n"));
    logReport("clipboard", "Timestamp links copied to clipboard", filtered.length, scopeLines);
    notify(ok ? "All timestamp links copied" : "Copy failed", `${filtered.length} links`);
    setExportOpen(false);
  };

  /* --------------------------- bulk actions --------------------------- */

  const bulkVerify = (status: "verified" | "flagged") => {
    selectedMentions.forEach((m) => setMentionStatus(m.id, status));
    notify(
      `${selectedMentions.length} mentions marked ${status}`,
      status === "verified" ? "Nice QA round." : "They'll stand out in exports until resolved.",
    );
    setSelected(new Set());
  };

  const bulkExport = (kind: "csv" | "json") => {
    const rows = mentionsToRows(selectedMentions, videoMap, statuses);
    if (kind === "csv") download(`adlume-selection-${date}.csv`, toCsv(rows), "text/csv");
    else download(`adlume-selection-${date}.json`, toJson(rows), "application/json");
    logReport(kind, `Bulk selection — ${kind.toUpperCase()}`, selectedMentions.length, [
      `Selection: ${selectedMentions.length} mentions`,
    ]);
    notify(`${kind.toUpperCase()} downloaded`, `${selectedMentions.length} selected mentions`);
  };

  const bulkCopyLinks = async () => {
    const ok = await copyText(selectedMentions.map((m) => watchUrl(m.videoId, m.tStart)).join("\n"));
    logReport("clipboard", "Bulk selection — timestamp links", selectedMentions.length, [
      `Selection: ${selectedMentions.length} mentions`,
    ]);
    notify(ok ? "Links copied" : "Copy failed", `${selectedMentions.length} timestamp links`);
  };

  const bulkClips = async () => {
    if (zipping) return;
    setZipping(true);
    try {
      await downloadClipPackage(clipsFromMentions(selectedMentions, videoMap));
      logReport("zip", "Bulk selection — clip package", selectedMentions.length, [
        `Selection: ${selectedMentions.length} clips`,
      ]);
      notify("Clip package downloaded", `${selectedMentions.length} clips · manifest, timeline & scripts`);
    } finally {
      setZipping(false);
    }
  };

  const scopedVideo = videoId ? videoMap[videoId] : undefined;

  const STATUS_CHIPS: { id: StatusFilter; label: string; count: number; color: string }[] = [
    { id: "all", label: "All statuses", count: mentions.length, color: "#998D7E" },
    { id: "unreviewed", label: "Unreviewed", count: statusCounts.unreviewed, color: "#998D7E" },
    { id: "verified", label: "Verified", count: statusCounts.verified, color: "#52796F" },
    { id: "flagged", label: "Flagged", count: statusCounts.flagged, color: "#B5654A" },
  ];

  return (
    <div className="space-y-6">
      {/* ------------------------------- filter bar ------------------------------- */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search transcript text, advertisers, aliases…"
              className="input !py-2.5 !pl-11 !text-[13.5px]"
              aria-label="Search mentions"
            />
          </div>
          <FancySelect
            value={showId}
            onChange={setShowId}
            icon={Filter}
            ariaLabel="Filter by show"
            options={[
              { value: "all", label: "All shows" },
              ...SHOWS.map((s) => ({ value: s.id, label: s.name })),
            ]}
            className="w-[190px]"
          />
          <div className="flex items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2">
            <Calendar size={14} className="text-ink-faint" />
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mono w-[118px] cursor-pointer bg-transparent text-[12px] font-semibold text-ink-soft outline-none"
              aria-label="From date"
            />
            <span className="text-ink-faint">→</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mono w-[118px] cursor-pointer bg-transparent text-[12px] font-semibold text-ink-soft outline-none"
              aria-label="To date"
            />
          </div>
          <div className="relative">
            <button onClick={() => setExportOpen((v) => !v)} className="btn-gold !px-4 !py-2.5 text-[13px]">
              <Download size={15} /> Export report
            </button>
            <AnimatePresence>
              {exportOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 z-50 mt-2 w-[230px] overflow-hidden rounded-xl border border-line bg-paper p-1.5 shadow-lift"
                  >
                    {[
                      { icon: Download, label: "Download CSV", sub: "Excel-ready · UTF-8", fn: doExportCsv },
                      { icon: FileJson, label: "Download JSON", sub: "for downstream tools", fn: doExportJson },
                      { icon: FileText, label: "HTML report", sub: "branded · print to PDF", fn: doReport },
                      { icon: Link2, label: "Copy all links", sub: "timestamp URLs", fn: doCopyLinks },
                    ].map((it) => (
                      <button
                        key={it.label}
                        onClick={it.fn}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-champagne-soft"
                      >
                        <it.icon size={15} className="shrink-0 text-gold-deep" />
                        <span>
                          <span className="block text-[12.5px] font-semibold text-ink">{it.label}</span>
                          <span className="block text-[10.5px] text-ink-faint">{it.sub}</span>
                        </span>
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* advertiser chips */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-line-soft pt-4">
          <button
            onClick={() => setAdvId(null)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[12px] font-semibold transition",
              !advId ? "border-ink bg-ink text-cream" : "border-line bg-paper text-ink-soft hover:border-gold-tint",
            )}
          >
            All advertisers
          </button>
          {advertisers.map((a) => (
            <button
              key={a.id}
              onClick={() => setAdvId((cur) => (cur === a.id ? null : a.id))}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[12px] font-semibold transition",
                advId === a.id
                  ? "text-white"
                  : "border-line bg-paper text-ink-soft hover:border-gold-tint",
              )}
              style={advId === a.id ? { backgroundColor: a.color, borderColor: a.color } : undefined}
            >
              {a.name}
            </button>
          ))}
        </div>

        {/* type chips */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {TYPE_ORDER.map((t) => {
            const active = types.has(t);
            const meta = TYPE_META[t];
            const count = mentions.filter((m) => m.type === t).length;
            return (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition",
                  active ? "text-white" : "border-line bg-paper text-ink-soft hover:border-gold-tint",
                )}
                style={active ? { backgroundColor: meta.color, borderColor: meta.color } : undefined}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: active ? "#fff" : meta.color }} />
                {meta.label}
                <span className={cn("mono text-[10px]", active ? "text-white/75" : "text-ink-faint")}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* review status chips */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {STATUS_CHIPS.map((s) => {
            const active = statusFilter === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setStatusFilter(s.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition",
                  active ? "text-white" : "border-line bg-paper text-ink-soft hover:border-gold-tint",
                )}
                style={active ? { backgroundColor: s.color, borderColor: s.color } : undefined}
              >
                {s.id === "verified" && <BadgeCheck size={12} />}
                {s.id === "flagged" && <Flag size={11} />}
                {s.label}
                <span className={cn("mono text-[10px]", active ? "text-white/75" : "text-ink-faint")}>{s.count}</span>
              </button>
            );
          })}
          {activeFilters && (
            <button onClick={clearAll} className="ms-auto flex items-center gap-1.5 text-[12px] font-semibold text-gold-deep underline decoration-gold-tint underline-offset-4 hover:decoration-gold-deep">
              <RotateCcw size={12} /> Clear filters
            </button>
          )}
        </div>
      </div>

      {/* scoped-video banner */}
      {scopedVideo && (
        <div className="card flex items-center gap-3 border-gold-tint/60 bg-champagne-soft px-5 py-3.5">
          <Building2 size={15} className="shrink-0 text-gold-deep" />
          <span className="truncate text-[13px] font-medium text-ink">
            Scoped to episode: <span className="font-semibold">{scopedVideo.title}</span>
          </span>
          <span className="mono shrink-0 text-[11.5px] text-ink-faint">{scopedVideo.id}</span>
        </div>
      )}

      {/* result header */}
      <div className="flex items-end justify-between gap-4">
        <p className="text-[13.5px] text-ink-soft">
          <span className="mono text-[22px] font-semibold text-ink">{filtered.length}</span>{" "}
          mention{filtered.length !== 1 ? "s" : ""} across{" "}
          <span className="font-semibold text-ink">{videoCount}</span> video{videoCount !== 1 ? "s" : ""}
          {statusCounts.verified > 0 && (
            <span className="ms-2 inline-flex items-center gap-1 rounded-full bg-sage-soft px-2 py-0.5 text-[10.5px] font-semibold text-sage align-middle">
              <BadgeCheck size={11} /> {statusCounts.verified} verified
            </span>
          )}
        </p>
        {filtered.length > 0 && (
          <button
            onClick={toggleSelectVisible}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-soft transition hover:text-gold-deep"
          >
            {allVisibleSelected ? <CheckSquare2 size={15} className="text-gold-deep" /> : <Square size={15} className="text-ink-faint" />}
            {allVisibleSelected ? "Deselect all" : "Select all"}
          </button>
        )}
      </div>

      {/* list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Quote}
          title="No mentions match those filters"
          body="Try widening the date range or clearing an advertiser filter — or run a fresh analysis on a new video."
          action={
            activeFilters ? (
              <button onClick={clearAll} className="btn-ghost text-[13px]">
                <RotateCcw size={14} /> Clear all filters
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4 pb-4">
          {filtered.map((m) => (
            <MentionCard
              key={m.id}
              mention={m}
              video={videoMap[m.videoId]}
              defaultExpanded={advId === "feldman" && m.advertiserId === "feldman"}
              selection={{ checked: selected.has(m.id), toggle: () => toggleSelect(m.id) }}
            />
          ))}
        </div>
      )}

      {/* ------------------------------ bulk action bar ------------------------------ */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 bottom-5 z-[65] flex justify-center px-4"
          >
            <div className="flex max-w-full flex-wrap items-center justify-center gap-x-1.5 gap-y-2 rounded-2xl border border-white/10 bg-ink/95 px-3.5 py-3 shadow-lift backdrop-blur">
              <span className="mono px-2 text-[12px] font-semibold text-gold-tint">
                {selected.size} selected
              </span>
              <span className="h-5 w-px bg-white/15" />
              <button onClick={() => bulkVerify("verified")} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold text-cream/90 transition hover:bg-white/10">
                <BadgeCheck size={13} className="text-sage-soft" /> Verify
              </button>
              <button onClick={() => bulkVerify("flagged")} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold text-cream/90 transition hover:bg-white/10">
                <Flag size={12} className="text-terra-soft" /> Flag
              </button>
              <span className="hidden h-5 w-px bg-white/15 sm:block" />
              <button onClick={() => bulkExport("csv")} className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold text-cream/90 transition hover:bg-white/10 sm:flex">
                <Download size={13} /> CSV
              </button>
              <button onClick={() => bulkExport("json")} className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold text-cream/90 transition hover:bg-white/10 sm:flex">
                <FileJson size={13} /> JSON
              </button>
              <button onClick={bulkCopyLinks} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold text-cream/90 transition hover:bg-white/10">
                <Link2 size={13} /> Links
              </button>
              <button onClick={bulkClips} className="flex items-center gap-1.5 rounded-lg bg-gold px-3 py-1.5 text-[11.5px] font-semibold text-white transition hover:brightness-110">
                <Scissors size={13} /> {zipping ? "Bundling…" : "Clip pack"}
              </button>
              <button onClick={() => setSelected(new Set())} className="rounded-lg p-1.5 text-cream/50 transition hover:bg-white/10 hover:text-cream" aria-label="Clear selection">
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
