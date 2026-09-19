import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  Braces,
  Building2,
  ExternalLink,
  FileCode2,
  FileSpreadsheet,
  Film,
  ListOrdered,
  Minus,
  Plus,
  RotateCcw,
  Scissors,
  Terminal,
  Trash2,
} from "lucide-react";
import { ADVERTISERS, SHOW_MAP, SHOWS } from "../data/core";
import {
  buildEdl,
  buildFcpXml,
  buildFfmpegScripts,
  buildManifestCsv,
  buildManifestJson,
  clipDuration,
  clipsFromMentions,
  downloadClipPackage,
  estimatedClipSizeMB,
  totalClipSeconds,
  type ClipSpec,
} from "../lib/clips";
import { download } from "../lib/export";
import { fmtTime } from "../lib/youtube";
import { useApp } from "../state/AppContext";
import { EmptyState, FancySelect, TypeBadge } from "../components/ui";
import { MentionType } from "../data/core";
import { cn } from "../utils/cn";

interface Trim {
  ds: number;
  de: number;
}

export default function Clips() {
  const { mentions, videos, videoMap, logReport, notify } = useApp();
  const [advId, setAdvId] = useState("all");
  const [showId, setShowId] = useState("all");
  const [videoId, setVideoId] = useState("all");
  const [padBefore, setPadBefore] = useState(6);
  const [padAfter, setPadAfter] = useState(5);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [trims, setTrims] = useState<Record<string, Trim>>({});
  const [zipping, setZipping] = useState(false);

  const scoped = useMemo(
    () =>
      mentions.filter((m) => {
        const v = videoMap[m.videoId];
        if (advId !== "all" && m.advertiserId !== advId) return false;
        if (showId !== "all" && v?.showId !== showId) return false;
        if (videoId !== "all" && m.videoId !== videoId) return false;
        return true;
      }),
    [mentions, videoMap, advId, showId, videoId],
  );

  const baseClips = useMemo(
    () => clipsFromMentions(scoped, videoMap, padBefore, padAfter),
    [scoped, videoMap, padBefore, padAfter],
  );

  // apply trims + removals
  const clips: ClipSpec[] = useMemo(() => {
    return baseClips
      .filter((c) => !removed.has(c.id))
      .map((c, i) => {
        const t = trims[c.id];
        if (!t) return { ...c, name: renameIndex(c, i) };
        const v = videoMap[c.videoId];
        const dur = v?.durationSec ?? c.end;
        const start = Math.max(0, Math.min(c.start + t.ds, c.end - 4));
        const end = Math.max(start + 4, Math.min(dur, c.end + t.de));
        return { ...c, start, end, name: renameIndex(c, i) };
      });
  }, [baseClips, removed, trims, videoMap]);

  function renameIndex(c: ClipSpec, i: number): ClipSpec["name"] {
    return `${String(i + 1).padStart(2, "0")}` + c.name.slice(2);
  }

  const adjustTrim = (clip: ClipSpec, dir: "ds" | "de", delta: number) => {
    setTrims((prev) => {
      const cur = prev[clip.id] ?? { ds: 0, de: 0 };
      const next = { ...cur, [dir]: (cur[dir] + delta) };
      // keep window between 4s and 90s
      const v = videoMap[clip.videoId];
      const baseDur = v?.durationSec ?? clip.end;
      const s = Math.max(0, Math.min(clip.start + next.ds, baseDur - 4));
      const e = Math.min(baseDur, Math.max(s + 4, clip.end + next.de));
      if (e - s > 90 || e - s < 4) return prev;
      return { ...prev, [clip.id]: next };
    });
  };

  const resetAll = () => {
    setRemoved(new Set());
    setTrims({});
    notify("Clip list restored", "Removed clips and trims reset.");
  };

  const totalSec = totalClipSeconds(clips);
  const estMb = estimatedClipSizeMB(clips);

  const clipScope = () => [
    `${clips.length} clips`,
    advId === "all" ? "All advertisers" : `Advertiser: ${advId}`,
    `Pads: ${padBefore}s / ${padAfter}s`,
  ];

  const exportFile = (kind: "csv" | "json" | "fcpxml" | "edl" | "sh") => {
    if (!clips.length) return;
    const date = new Date().toISOString().slice(0, 10);
    if (kind === "csv") download(`adlume-clips-${date}.csv`, buildManifestCsv(clips), "text/csv");
    if (kind === "json") download(`adlume-clips-${date}.json`, buildManifestJson(clips), "application/json");
    if (kind === "fcpxml") download(`adlume-clips-${date}.fcpxml`, buildFcpXml(clips), "application/xml");
    if (kind === "edl") download(`adlume-clips-${date}.edl`, buildEdl(clips), "text/plain");
    if (kind === "sh") download(`adlume-clips-${date}.sh`, buildFfmpegScripts(clips).sh, "text/x-shellscript");
    logReport(
      kind === "fcpxml" || kind === "edl" || kind === "sh" ? "edit" : kind,
      `Clip Studio — ${kind.toUpperCase()} export`,
      clips.length,
      clipScope(),
    );
    notify("Export downloaded", `${clips.length} clips · ${kind.toUpperCase()}`);
  };

  const exportZip = async () => {
    if (!clips.length || zipping) return;
    setZipping(true);
    try {
      await downloadClipPackage(clips);
      logReport("zip", "Clip Studio — clip package (.zip)", clips.length, clipScope());
      notify("Clip package downloaded", `${clips.length} clips · manifests, timeline & render scripts`);
    } finally {
      setZipping(false);
    }
  };

  const hasTweaks = removed.size > 0 || Object.keys(trims).length > 0;

  return (
    <div className="space-y-6">
      {/* ---------------------------------- header ---------------------------------- */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-2">Clip Studio</div>
          <h1 className="serif-tight text-[clamp(26px,3vw,32px)] font-semibold leading-tight text-ink">
            {clips.length} clips, ready to cut
          </h1>
          <p className="mt-2 max-w-xl text-[13.5px] text-ink-soft">
            Every mention becomes a trimmed clip window — adjust trims, then export an edit-ready
            timeline or a script that renders real MP4s.
          </p>
        </div>
        <button onClick={exportZip} disabled={!clips.length || zipping} className="btn-gold">
          {zipping ? (
            <>
              <span className="h-4 w-4 animate-spin-slow rounded-full border-2 border-white/40 border-t-white" />
              Bundling…
            </>
          ) : (
            <>
              <Archive size={16} /> Download clip package (.zip)
            </>
          )}
        </button>
      </div>

      {/* ------------------------------- configuration ------------------------------ */}
      <div className="card grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-4">
        <FancySelect
          value={advId}
          onChange={setAdvId}
          icon={Building2}
          ariaLabel="Filter by advertiser"
          options={[
            { value: "all", label: "All advertisers" },
            ...ADVERTISERS.map((a) => ({ value: a.id, label: a.name })),
          ]}
        />
        <FancySelect
          value={showId}
          onChange={setShowId}
          icon={Film}
          ariaLabel="Filter by show"
          options={[
            { value: "all", label: "All shows" },
            ...SHOWS.map((s) => ({ value: s.id, label: s.name })),
          ]}
        />
        <FancySelect
          value={videoId}
          onChange={setVideoId}
          icon={Film}
          ariaLabel="Filter by video"
          options={[
            { value: "all", label: "All episodes" },
            ...videos
              .slice()
              .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
              .map((v) => ({ value: v.id, label: v.title.slice(0, 34) })),
          ]}
        />
        <div className="flex flex-col justify-center gap-2.5">
          <label className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
            Pad before
            <span className="mono text-[12px] font-semibold normal-case tracking-normal text-gold-deep">{padBefore}s</span>
          </label>
          <input
            type="range"
            min={0}
            max={15}
            value={padBefore}
            onChange={(e) => setPadBefore(+e.target.value)}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line-soft accent-[#A8763E]"
            aria-label="Padding before mention"
          />
          <label className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
            Pad after
            <span className="mono text-[12px] font-semibold normal-case tracking-normal text-gold-deep">{padAfter}s</span>
          </label>
          <input
            type="range"
            min={0}
            max={15}
            value={padAfter}
            onChange={(e) => setPadAfter(+e.target.value)}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line-soft accent-[#A8763E]"
            aria-label="Padding after mention"
          />
        </div>
      </div>

      {/* --------------------------------- export rail ------------------------------- */}
      <div className="card flex flex-wrap items-center gap-x-5 gap-y-3 border-gold-tint/50 bg-champagne-soft px-5 py-4">
        <div className="min-w-[170px]">
          <div className="mono text-[17px] font-semibold text-ink">
            {clips.length} clips · {fmtTime(totalSec)}
          </div>
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            ≈ {estMb} MB rendered
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { icon: FileSpreadsheet, label: "CSV", fn: () => exportFile("csv") },
            { icon: Braces, label: "JSON", fn: () => exportFile("json") },
            { icon: FileCode2, label: "FCPXML", fn: () => exportFile("fcpxml") },
            { icon: ListOrdered, label: "EDL", fn: () => exportFile("edl") },
            { icon: Terminal, label: "ffmpeg script", fn: () => exportFile("sh") },
          ].map((b) => (
            <button key={b.label} onClick={b.fn} disabled={!clips.length} className="btn-ghost !py-2 text-[12px]">
              <b.icon size={14} /> {b.label}
            </button>
          ))}
        </div>
        {hasTweaks && (
          <button onClick={resetAll} className="ms-auto flex items-center gap-1.5 text-[12px] font-semibold text-gold-deep underline decoration-gold-tint underline-offset-4 hover:decoration-gold-deep">
            <RotateCcw size={12} /> Reset trims
          </button>
        )}
      </div>

      {/* ---------------------------------- clip list -------------------------------- */}
      {clips.length === 0 ? (
        <EmptyState
          icon={Scissors}
          title="No clips in this scope"
          body="Loosen the filters above — or analyze a new video, and its mentions will appear here automatically as cut-ready clips."
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {clips.map((c, i) => {
              const v = videoMap[c.videoId];
              const mention = mentions.find((m) => m.id === c.mentionId);
              const trimmed = !!trims[c.id];
              return (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3 }}
                  className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5"
                >
                  <span className="mono w-7 shrink-0 text-[13px] font-semibold text-ink-faint">
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="mono truncate text-[12.5px] font-semibold text-ink">
                      {c.name}.mp4
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-ink-faint">
                      <span className="font-semibold text-gold-deep">{c.advertiserName}</span>
                      <span className="h-0.5 w-0.5 rounded-full bg-ink-faint" />
                      <span className="truncate">{v?.title}</span>
                      <span className="hidden h-0.5 w-0.5 rounded-full bg-ink-faint sm:block" />
                      <span className="hidden text-ink-faint sm:inline">{SHOW_MAP[v?.showId ?? ""]?.name}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      {mention && <TypeBadge type={mention.type as MentionType} className="!px-2 !py-0.5 !text-[9px]" />}
                      {trimmed && (
                        <span className="rounded-full bg-steel-soft px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-steel">
                          manually trimmed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* trim controls */}
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="flex items-center gap-1 rounded-xl border border-line bg-cream px-1.5 py-1.5">
                      <button onClick={() => adjustTrim(c, "ds", -1)} className="flex h-5 w-5 items-center justify-center rounded-md text-ink-faint transition hover:bg-champagne hover:text-gold-deep" aria-label="Start 1s earlier" title="Start 1s earlier">
                        <Minus size={11} strokeWidth={3} />
                      </button>
                      <button onClick={() => adjustTrim(c, "ds", 1)} className="flex h-5 w-5 items-center justify-center rounded-md text-ink-faint transition hover:bg-champagne hover:text-gold-deep" aria-label="Start 1s later" title="Start 1s later">
                        <Plus size={11} strokeWidth={3} />
                      </button>
                      <span className="mono min-w-[108px] text-center text-[11.5px] font-semibold text-ink">
                        {fmtTime(c.start)} → {fmtTime(c.end)}
                      </span>
                      <button onClick={() => adjustTrim(c, "de", -1)} className="flex h-5 w-5 items-center justify-center rounded-md text-ink-faint transition hover:bg-champagne hover:text-gold-deep" aria-label="End 1s earlier" title="End 1s earlier">
                        <Minus size={11} strokeWidth={3} />
                      </button>
                      <button onClick={() => adjustTrim(c, "de", 1)} className="flex h-5 w-5 items-center justify-center rounded-md text-ink-faint transition hover:bg-champagne hover:text-gold-deep" aria-label="End 1s later" title="End 1s later">
                        <Plus size={11} strokeWidth={3} />
                      </button>
                    </div>
                    <span className="mono w-14 text-right text-[12px] font-semibold text-gold-deep">
                      {fmtTime(clipDuration(c))}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <a
                      href={`https://www.youtube.com/watch?v=${c.videoId}&t=${Math.floor(c.start)}s`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg p-2 text-ink-faint transition hover:bg-champagne-soft hover:text-gold-deep"
                      aria-label="Preview on YouTube"
                      title="Preview at clip start on YouTube"
                    >
                      <ExternalLink size={15} />
                    </a>
                    <button
                      onClick={() => setRemoved((prev) => new Set(prev).add(c.id))}
                      className="rounded-lg p-2 text-ink-faint transition hover:bg-terra-soft hover:text-terra"
                      aria-label="Remove clip"
                      title="Remove clip from package"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <p className={cn("text-center text-[11.5px] leading-relaxed text-ink-faint")}>
        The ZIP package contains a clip manifest, edit-ready timeline (FCPXML), CMX EDL, and{" "}
        <span className="font-semibold text-ink-soft">cut.sh / cut.bat</span> — run either with yt-dlp +
        ffmpeg to render real MP4 clips from the source YouTube videos.
      </p>
    </div>
  );
}
