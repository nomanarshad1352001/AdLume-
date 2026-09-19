import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, Check, ChevronDown, Copy, Flag, Play } from "lucide-react";
import {
  ADVERTISER_MAP,
  Mention,
  SHOW_MAP,
  VideoItem,
} from "../data/core";
import { mentionBeats } from "../data/generator";
import { fmtDate, fmtTime, watchUrl } from "../lib/youtube";
import { copyText } from "../lib/export";
import { useApp } from "../state/AppContext";
import { ConfidenceMeter, Highlight, Monogram, TypeBadge } from "./ui";
import { cn } from "../utils/cn";

export function MentionCard({
  mention,
  video,
  defaultExpanded = false,
  className,
  selection,
}: {
  mention: Mention;
  video: VideoItem | undefined;
  defaultExpanded?: boolean;
  className?: string;
  selection?: { checked: boolean; toggle: () => void };
}) {
  const { notify, statuses, setMentionStatus } = useApp();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);

  const status = statuses[mention.id];

  const adv = ADVERTISER_MAP[mention.advertiserId];
  const show = video ? SHOW_MAP[video.showId] : undefined;
  const link = watchUrl(mention.videoId, mention.tStart);
  const beats = mentionBeats(mention);
  const head = beats.slice(Math.max(0, beats.findIndex((b) => b.hit) - 1), beats.findIndex((b) => b.hit) + 2);
  const visibleBeats = expanded ? beats : head;

  const onCopy = async () => {
    const ok = await copyText(link);
    if (ok) {
      setCopied(true);
      notify("Timestamp link copied", link);
      window.setTimeout(() => setCopied(false), 1600);
    } else {
      notify("Copy failed", "Select and copy the link manually.");
    }
  };

  const toggleVerify = () => {
    if (status === "verified") {
      setMentionStatus(mention.id, undefined);
      notify("Verification cleared", `${adv?.name ?? "Mention"} @ ${fmtTime(mention.tStart)}`);
    } else {
      setMentionStatus(mention.id, "verified");
      notify("Mention marked verified", `${adv?.name ?? "Mention"} @ ${fmtTime(mention.tStart)}`);
    }
  };

  const toggleFlag = () => {
    if (status === "flagged") {
      setMentionStatus(mention.id, undefined);
      notify("Flag removed", `${adv?.name ?? "Mention"} @ ${fmtTime(mention.tStart)}`);
    } else {
      setMentionStatus(mention.id, "flagged");
      notify("Mention flagged for review", "It'll stand out in exports until resolved.");
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "card group overflow-hidden transition-shadow duration-300 hover:shadow-lift",
        selection?.checked && "border-gold-tint ring-2 ring-gold/25",
        className,
      )}
    >
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:gap-6 sm:p-6">
        {/* ------------------------------ timestamp rail ------------------------------ */}
        <div className="flex shrink-0 items-start justify-between gap-3 sm:w-[118px] sm:flex-col sm:justify-start">
          <div>
            <div className="mono text-[26px] font-semibold leading-none tracking-tight text-ink">
              {fmtTime(mention.tStart)}
            </div>
            <div className="mt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
              of {video ? fmtTime(video.durationSec) : "—"}
            </div>
          </div>
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-cream transition hover:bg-[#332a20] sm:w-full sm:justify-center"
          >
            <Play size={12} className="fill-current" />
            Open
          </a>
          {selection && (
            <button
              onClick={selection.toggle}
              aria-label={selection.checked ? "Deselect mention" : "Select mention"}
              title={selection.checked ? "Deselect" : "Select for bulk actions"}
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-lg border transition-all duration-200 sm:mt-0.5",
                selection.checked
                  ? "border-gold bg-gold text-white shadow-gold"
                  : "border-line bg-paper text-transparent hover:border-gold-tint hover:text-gold-tint",
              )}
            >
              <Check size={13} strokeWidth={3} />
            </button>
          )}
        </div>

        {/* --------------------------------- content --------------------------------- */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {adv && <Monogram advertiser={adv} size={34} />}
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold text-ink">{adv?.name}</div>
              <div className="text-[11.5px] text-ink-faint">
                spoken as <span className="font-medium italic text-ink-soft">“{mention.matchedText}”</span>
              </div>
            </div>
            <div className="ms-auto flex flex-wrap items-center gap-2">
              {status === "verified" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sage-soft px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-sage">
                  <BadgeCheck size={12} /> Verified
                </span>
              )}
              {status === "flagged" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-terra-soft px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-terra">
                  <Flag size={11} /> Flagged
                </span>
              )}
              <TypeBadge type={mention.type} />
              <ConfidenceMeter value={mention.confidence} />
            </div>
          </div>

          {/* transcript window */}
          <div className="relative mt-4 overflow-hidden rounded-xl border border-line-soft bg-cream/80 px-4 py-3">
            <span className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-gold-tint via-gold to-gold-deep opacity-70" />
            <div className="space-y-2.5">
              <AnimatePresence initial={false}>
                {visibleBeats.map((b, i) => (
                  <motion.div
                    key={`${b.t}-${i}`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="flex items-baseline gap-3 overflow-hidden"
                  >
                    <span
                      className={cn(
                        "mono w-[44px] shrink-0 text-[10.5px] font-medium",
                        b.hit ? "text-gold-deep" : "text-ink-faint/80",
                      )}
                    >
                      {fmtTime(b.t)}
                    </span>
                    <p
                      className={cn(
                        "text-[13.5px] leading-relaxed",
                        b.hit ? "font-medium text-ink" : "text-ink-soft/85",
                      )}
                    >
                      {b.hit ? <Highlight text={b.text} term={mention.matchedText} /> : b.text}
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* meta + actions */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-soft">
              <span className="h-1 w-1 rounded-full bg-gold" />
              {show?.name ?? "—"}
            </span>
            <span className="text-[12px] text-ink-faint">
              {video ? `${video.title}` : mention.videoId} · {video ? fmtDate(video.publishedAt) : ""}
            </span>
            <div className="ms-auto flex flex-wrap items-center gap-1.5">
              <button
                onClick={toggleVerify}
                className={cn(
                  "chip !py-1.5 text-[11px]",
                  status === "verified" && "!border-sage/40 !bg-sage-soft !text-sage",
                )}
                title="Mark as verified"
              >
                <BadgeCheck size={13} />
                {status === "verified" ? "Verified" : "Verify"}
              </button>
              <button
                onClick={toggleFlag}
                className={cn(
                  "chip !py-1.5 text-[11px]",
                  status === "flagged" && "!border-terra/40 !bg-terra-soft !text-terra",
                )}
                title="Flag for review"
              >
                <Flag size={12} />
                {status === "flagged" ? "Flagged" : "Flag"}
              </button>
              <button
                onClick={() => setExpanded((v) => !v)}
                className="chip !py-1.5 text-[11px]"
                aria-expanded={expanded}
              >
                <ChevronDown size={13} className={cn("transition-transform duration-300", expanded && "rotate-180")} />
                {expanded ? "Less" : "Context"}
              </button>
              <button onClick={onCopy} className="chip !py-1.5 text-[11px]" aria-label="Copy timestamp link">
                {copied ? <Check size={13} className="text-sage" /> : <Copy size={13} />}
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
