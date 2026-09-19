import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AudioLines,
  Check,
  CheckCheck,
  Clipboard,
  Clapperboard,
  Download,
  FileJson,
  FileText,
  Link2,
  Loader2,
  Play,
  Quote,
  RotateCcw,
  ScanSearch,
  Scissors,
  Speech,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { Mention, VideoItem } from "../data/core";
import { generateMentions } from "../data/generator";
import { clipsFromMentions, downloadClipPackage } from "../lib/clips";
import { fmtTime, parseYouTubeUrl, watchUrl } from "../lib/youtube";
import { download, mentionsToRows, toCsv, toJson } from "../lib/export";
import { downloadReport } from "../lib/report";
import { useApp } from "../state/AppContext";
import { Monogram } from "../components/ui";
import { MentionCard } from "../components/MentionCard";
import { cn } from "../utils/cn";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Step {
  id: string;
  label: string;
  detail: string;
  icon: LucideIcon;
  ms: number;
  pct: number;
}

const STEPS: Step[] = [
  { id: "fetch", label: "Fetching video metadata", detail: "Resolving stream · title · runtime", icon: Clapperboard, ms: 700, pct: 14 },
  { id: "audio", label: "Extracting audio track", detail: "160kbps opus → 16kHz mono PCM", icon: AudioLines, ms: 950, pct: 30 },
  { id: "asr", label: "Transcribing speech", detail: "Whisper large-v3 · word-level offsets", icon: Speech, ms: 2500, pct: 68 },
  { id: "detect", label: "Detecting mentions & aliases", detail: "Fuzzy entity matching · phonetic fallback", icon: ScanSearch, ms: 1700, pct: 90 },
  { id: "verify", label: "Verifying timestamps", detail: "Aligning offsets to transcript anchors", icon: CheckCheck, ms: 800, pct: 100 },
];

export default function Analyze() {
  const { videos, advertisers, statuses, addAnalysis, logReport, notify } = useApp();
  const [url, setUrl] = useState("");
  const parsed = useMemo(() => (url.trim() ? parseYouTubeUrl(url) : null), [url]);
  const invalid = url.trim().length > 5 && !parsed;

  const libraryHit = useMemo(
    () => (parsed ? videos.find((v) => v.id === parsed.id) : undefined),
    [parsed, videos],
  );

  const [selected, setSelected] = useState<Set<string>>(() => new Set(["feldman"]));
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [stepIdx, setStepIdx] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<{ video: VideoItem; mentions: Mention[] } | null>(null);
  const [zipping, setZipping] = useState(false);
  const runRef = useRef(0);

  const toggleAdv = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text.trim());
    } catch {
      notify("Clipboard blocked", "Paste the link manually with Ctrl/Cmd+V.");
    }
  };

  const reset = () => {
    runRef.current++;
    setPhase("idle");
    setLogs([]);
    setResult(null);
    setStepIdx(0);
    setUrl("");
  };

  const run = async () => {
    if (!parsed || selected.size === 0) return;
    const runId = ++runRef.current;
    setPhase("running");
    setResult(null);
    setLogs([]);

    const base = libraryHit ?? null;
    const video: VideoItem = base
      ? { ...base }
      : (await import("../data/generator")).videoFromYouTubeId(parsed.id);
    const mentions = generateMentions(video, [...selected], advertisers);

    const pushLog = (line: string) => setLogs((prev) => [...prev, line]);

    for (let i = 0; i < STEPS.length; i++) {
      if (runRef.current !== runId) return;
      setStepIdx(i);
      const step = STEPS[i];
      if (step.id === "fetch")
        pushLog(`resolved ${parsed.id} · runtime ${fmtTime(video.durationSec)}`);
      if (step.id === "audio") pushLog("demuxed audio stream · resampled for ASR");
      if (step.id === "asr") {
        pushLog(`tokenized ${(video.durationSec * 2.1) | 0} words · ${mentions.length + 14} candidate entities`);
      }
      if (step.id === "detect") {
        mentions.slice(0, 3).forEach((m) => {
          const adv = advertisers.find((a) => a.id === m.advertiserId);
          pushLog(
            `match '${m.matchedText}' → ${adv?.name} (${m.confidence.toFixed(2)}) @ ${fmtTime(m.tStart)}`,
          );
        });
        pushLog(`${mentions.length} confirmed mentions across ${selected.size} advertiser${selected.size > 1 ? "s" : ""}`);
      }
      if (step.id === "verify") pushLog("offsets verified · mean drift ±0.8s");
      await wait(step.ms);
    }

    if (runRef.current !== runId) return;
    addAnalysis(video, mentions);
    setResult({ video, mentions });
    setPhase("done");
    notify("Analysis saved to library", `${mentions.length} mentions · ${video.title}`);
  };

  const aliasCount = [...selected].reduce(
    (n, id) => n + 1 + (advertisers.find((a) => a.id === id)?.aliases.length ?? 0),
    0,
  );

  const exportClips = async () => {
    if (!result || zipping) return;
    setZipping(true);
    try {
      const map = { [result.video.id]: result.video };
      await downloadClipPackage(clipsFromMentions(result.mentions, map));
      logReport("zip", `${result.video.title} — clip package`, result.mentions.length, [
        `Video: ${result.video.id}`,
      ]);
      notify("Clip package downloaded", `${result.mentions.length} clips · manifest, timeline & scripts`);
    } finally {
      setZipping(false);
    }
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[380px_1fr]">
      {/* --------------------------------- left: config -------------------------------- */}
      <div className="space-y-5 lg:sticky lg:top-7">
        <div className="card overflow-hidden">
          <div className="border-b border-line-soft bg-gradient-to-br from-champagne-soft to-cream px-5 py-4">
            <div className="eyebrow mb-1">Step 01</div>
            <h2 className="serif-tight text-[20px] font-semibold text-ink">Drop in a YouTube link</h2>
          </div>
          <div className="space-y-4 p-5">
            <div className="relative">
              <Link2 size={17} className="pointer-events-none absolute left-4 top-[15px] text-gold-deep" />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=…"
                aria-label="YouTube URL"
                spellCheck={false}
                className={cn(
                  "input mono !py-3.5 !pl-11 pr-12 !text-[13px]",
                  invalid && "!border-terra/60 !ring-terra/10",
                  parsed && "!border-sage/50",
                )}
              />
              <button
                onClick={paste}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-faint transition hover:bg-champagne-soft hover:text-gold-deep"
                aria-label="Paste from clipboard"
                title="Paste from clipboard"
              >
                <Clipboard size={15} />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {invalid && (
                <motion.p
                  key="err"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-[12px] font-medium text-terra"
                >
                  That doesn't look like a YouTube link — try a watch, youtu.be, Shorts or Live URL.
                </motion.p>
              )}
              {parsed && (
                <motion.div
                  key="ok"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="overflow-hidden rounded-xl border border-sage/30 bg-sage-soft/60"
                >
                  <div className="flex items-center gap-2 px-3.5 py-2.5">
                    <Check size={14} className="text-sage" />
                    <span className="mono text-[11.5px] font-semibold text-sage">
                      video detected · {parsed.id}
                    </span>
                    {parsed.start !== undefined && (
                      <span className="mono ms-auto text-[11px] text-sage/80">starts @{fmtTime(parsed.start)}</span>
                    )}
                  </div>
                  {libraryHit && (
                    <div className="border-t border-sage/20 bg-paper/70 px-3.5 py-2 text-[11.5px] text-ink-soft">
                      Already in your library — re-analyzing will refresh its mention record.
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line-soft px-5 py-4">
            <div>
              <div className="eyebrow mb-1">Step 02</div>
              <h2 className="serif-tight text-[20px] font-semibold text-ink">Who should we listen for?</h2>
            </div>
            <button
              onClick={() =>
                setSelected((prev) =>
                  prev.size === advertisers.length ? new Set() : new Set(advertisers.map((a) => a.id)),
                )
              }
              className="text-[11.5px] font-semibold text-gold-deep underline decoration-gold-tint underline-offset-4 hover:decoration-gold-deep"
            >
              {selected.size === advertisers.length ? "Clear" : "All"}
            </button>
          </div>
          <div className="grid max-h-[320px] grid-cols-1 gap-1.5 overflow-y-auto p-3.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {advertisers.map((a) => {
              const active = selected.has(a.id);
              return (
                <button
                  key={a.id}
                  onClick={() => toggleAdv(a.id)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-all duration-200",
                    active
                      ? "border-gold-tint bg-champagne-soft shadow-soft"
                      : "border-line bg-paper hover:border-gold-tint/60",
                  )}
                >
                  <Monogram advertiser={a} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-semibold text-ink">{a.name}</span>
                    <span className="block truncate text-[10px] text-ink-faint">
                      +{a.aliases.length} aliases
                    </span>
                  </span>
                  <span
                    className={cn(
                      "flex items-center justify-center rounded-full border transition",
                      active ? "border-gold bg-gold text-white" : "border-line text-transparent",
                    )}
                    style={{ width: 18, height: 18 }}
                  >
                    <Check size={11} strokeWidth={3} />
                  </span>
                </button>
              );
            })}
          </div>
          <div className="border-t border-line-soft px-5 py-3 text-[11.5px] text-ink-faint">
            {selected.size > 0 ? (
              <>
                Listening for <span className="font-semibold text-ink-soft">{aliasCount} name variants</span> across{" "}
                {selected.size} advertiser{selected.size > 1 ? "s" : ""}.
              </>
            ) : (
              "Select at least one advertiser to continue."
            )}
          </div>
        </div>

        <button onClick={run} disabled={!parsed || selected.size === 0 || phase === "running"} className="btn-gold w-full !py-3.5">
          {phase === "running" ? (
            <>
              <Loader2 size={16} className="animate-spin-slow" /> Analyzing…
            </>
          ) : (
            <>
              <ScanSearch size={16} /> Run mention detection
            </>
          )}
        </button>
      </div>

      {/* --------------------------------- right: output -------------------------------- */}
      <div className="min-w-0">
        {phase === "idle" && !result && (
          <div className="card relative min-h-[520px] overflow-hidden">
            <img
              src="https://images.pexels.com/photos/39075530/pexels-photo-39075530.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1200"
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-[0.14]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-paper/40 via-transparent to-paper/80" />
            <div className="relative flex h-full min-h-[520px] flex-col items-center justify-center px-10 text-center">
              <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-gold-tint bg-champagne-soft text-gold-deep shadow-gold">
                <Quote size={24} strokeWidth={1.7} />
              </span>
              <h3 className="serif-tight max-w-md text-[26px] font-semibold leading-snug text-ink">
                Every advertiser mention, <span className="italic text-gold-deep">second-accurate.</span>
              </h3>
              <p className="mt-3 max-w-sm text-[13.5px] leading-relaxed text-ink-soft">
                Paste a link on the left, choose who we're listening for, and AdLume returns transcript
                context, mention type, and one-click YouTube timestamp links.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold text-ink-faint">
                {["Transcript + word offsets", "Alias detection", "Type classification", "CSV / JSON / clip exports"].map((t) => (
                  <span key={t} className="rounded-full border border-line bg-paper px-3 py-1.5">{t}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {phase === "running" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="eyebrow mb-1.5">Pipeline running</div>
                <h3 className="serif-tight text-[24px] font-semibold text-ink">Combing the audio…</h3>
              </div>
              <span className="mono rounded-full border border-gold-tint bg-champagne-soft px-3 py-1.5 text-[12px] font-semibold text-gold-deep">
                {STEPS[stepIdx].pct}%
              </span>
            </div>

            <div className="relative mt-6 h-2 overflow-hidden rounded-full bg-line-soft">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ background: "linear-gradient(90deg,#DFC594,#A8763E)" }}
                animate={{ width: `${STEPS[stepIdx].pct}%` }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
              <div className="absolute inset-y-0 w-1/3 animate-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            </div>

            <div className="mt-7 space-y-1">
              {STEPS.map((s, i) => {
                const state = i < stepIdx ? "done" : i === stepIdx ? "active" : "pending";
                return (
                  <div
                    key={s.id}
                    className={cn(
                      "flex items-center gap-3.5 rounded-xl px-3 py-2.5 transition",
                      state === "active" && "bg-champagne-soft",
                      state === "pending" && "opacity-40",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full border",
                        state === "done" && "border-gold/40 bg-champagne text-gold-deep",
                        state === "active" && "border-gold bg-gold text-white",
                        state === "pending" && "border-line bg-paper text-ink-faint",
                      )}
                    >
                      {state === "done" ? <Check size={14} strokeWidth={3} /> : state === "active" ? <Loader2 size={14} className="animate-spin-slow" /> : <s.icon size={14} />}
                    </span>
                    <div className="flex-1">
                      <div className={cn("text-[13.5px] font-semibold", state === "pending" ? "text-ink-faint" : "text-ink")}>{s.label}</div>
                      <div className="text-[11px] text-ink-faint">{s.detail}</div>
                    </div>
                    {state === "done" && <Check size={14} className="text-sage" />}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 overflow-hidden rounded-xl border border-line bg-ink">
              <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
                <span className="h-2 w-2 rounded-full bg-white/20" />
                <span className="h-2 w-2 rounded-full bg-white/20" />
                <span className="ms-2 mono text-[10px] uppercase tracking-[0.2em] text-white/40">adlume engine — live log</span>
              </div>
              <div className="mono max-h-[150px] space-y-1.5 overflow-y-auto px-4 py-3.5 text-[11.5px] leading-relaxed text-gold-tint/90">
                {logs.map((l, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
                    <span className="text-white/30">›</span> {l}
                    {i === logs.length - 1 && <span className="ms-1 inline-block h-3 w-1.5 animate-blink bg-gold-tint align-middle" />}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {phase === "done" && result && (
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-5">
            {/* video panel */}
            <div className="card overflow-hidden">
              <div className="grid sm:grid-cols-[230px_1fr]">
                <a href={watchUrl(result.video.id)} target="_blank" rel="noreferrer" className="group relative block min-h-[130px]">
                  <img
                    src={result.video.thumbnail}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://images.pexels.com/photos/28174482/pexels-photo-28174482.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=500&w=880";
                    }}
                  />
                  <div className="absolute inset-0 bg-ink/25 transition group-hover:bg-ink/10" />
                  <span className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-lift transition group-hover:scale-110">
                    <Play size={16} className="ms-0.5 fill-current" />
                  </span>
                  <span className="mono absolute bottom-2 right-2 rounded-md bg-ink/85 px-2 py-0.5 text-[11px] font-semibold text-cream">
                    {fmtTime(result.video.durationSec)}
                  </span>
                </a>
                <div className="min-w-0 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="eyebrow mb-1">Analysis complete</div>
                      <h3 className="serif-tight truncate text-[19px] font-semibold text-ink">{result.video.title}</h3>
                      <p className="mono mt-1 truncate text-[11.5px] text-ink-faint">youtube.com/watch?v={result.video.id}</p>
                    </div>
                  </div>
                  {/* export row */}
                  <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
                    <span className="me-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-faint">Export</span>
                    {[
                      {
                        icon: Download, label: "CSV",
                        fn: () => {
                          const rows = mentionsToRows(result.mentions, { [result.video.id]: result.video }, statuses);
                          download(`adlume-${result.video.id}.csv`, toCsv(rows), "text/csv");
                          logReport("csv", `${result.video.title} — CSV`, result.mentions.length, [
                            `Video: ${result.video.id}`,
                          ]);
                          notify("CSV downloaded", `${result.mentions.length} rows`);
                        },
                      },
                      {
                        icon: FileJson, label: "JSON",
                        fn: () => {
                          const rows = mentionsToRows(result.mentions, { [result.video.id]: result.video }, statuses);
                          download(`adlume-${result.video.id}.json`, toJson(rows), "application/json");
                          logReport("json", `${result.video.title} — JSON`, result.mentions.length, [
                            `Video: ${result.video.id}`,
                          ]);
                          notify("JSON downloaded");
                        },
                      },
                      {
                        icon: FileText, label: "HTML report",
                        fn: () => {
                          downloadReport(result.mentions, { [result.video.id]: result.video }, statuses, {
                            title: `${result.video.title} — Mention Report`,
                            subtitle: `${result.mentions.length} mentions detected`,
                            scope: [
                              `Video: youtube.com/watch?v=${result.video.id}`,
                              `Runtime: ${fmtTime(result.video.durationSec)}`,
                            ],
                          });
                          logReport("html", `${result.video.title} — Mention Report`, result.mentions.length, [
                            `Video: ${result.video.id}`,
                          ]);
                          notify("HTML report downloaded");
                        },
                      },
                      {
                        icon: Scissors, label: zipping ? "Bundling…" : "Clip pack",
                        fn: exportClips,
                      },
                    ].map((b) => (
                      <button key={b.label} onClick={b.fn} className="btn-ghost !px-3.5 !py-2 text-[12px]">
                        <b.icon size={14} /> {b.label}
                      </button>
                    ))}
                    <Link to={`/clips`} className="ms-auto text-[11.5px] font-semibold text-gold-deep underline decoration-gold-tint underline-offset-4 hover:decoration-gold-deep">
                      Open in Clip Studio
                    </Link>
                  </div>
                  <div className="mt-3.5 flex flex-wrap gap-1.5 border-t border-line-soft pt-3.5">
                    <span className="chip !border-gold-tint !bg-champagne-soft !text-gold-deep">
                      <Quote size={12} /> {result.mentions.length} mentions
                    </span>
                    <span className="chip">
                      <Timer size={12} /> runtime {fmtTime(result.video.durationSec)}
                    </span>
                    <span className="chip">
                      <Link2 size={12} /> {[...new Set(result.mentions.map((m) => m.advertiserId))].length} advertisers
                    </span>
                    <button onClick={reset} className="chip ms-auto !border-transparent !bg-transparent text-ink-faint hover:!text-gold-deep">
                      <RotateCcw size={12} /> Analyze another
                    </button>
                  </div>
                  {/* timestamp jump rail */}
                  <div className="mt-3.5 flex flex-wrap gap-1.5">
                    {result.mentions.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => document.getElementById(`mnt-${m.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
                        className="mono rounded-lg border border-line bg-cream px-2.5 py-1 text-[11px] font-semibold text-gold-deep transition hover:border-gold-tint hover:bg-champagne-soft"
                      >
                        {fmtTime(m.tStart)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* mention cards */}
            <div className="space-y-4">
              {result.mentions.map((m, i) => (
                <div key={m.id} id={`mnt-${m.id}`}>
                  <MentionCard mention={m} video={result.video} defaultExpanded={i === 0} />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
