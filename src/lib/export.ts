import {
  Mention,
  ADVERTISER_MAP,
  MentionStatus,
  SHOW_MAP,
  VideoItem,
  TYPE_META,
} from "../data/core";
import { fmtDate, fmtTime, watchUrl } from "./youtube";

export type StatusMap = Record<string, MentionStatus | undefined>;

export interface ExportRow {
  advertiser: string;
  matchedText: string;
  mentionType: string;
  show: string;
  videoTitle: string;
  videoDate: string;
  timestamp: string;
  startSeconds: number;
  confidence: string;
  status: string;
  youtubeLink: string;
  transcriptExcerpt: string;
}

export function statusLabel(status?: MentionStatus): string {
  if (status === "verified") return "Verified";
  if (status === "flagged") return "Flagged for review";
  return "Unreviewed";
}

export function mentionsToRows(
  mentions: Mention[],
  videoMap: Record<string, VideoItem>,
  statuses: StatusMap = {},
): ExportRow[] {
  return mentions.map((m) => {
    const v = videoMap[m.videoId];
    const adv = ADVERTISER_MAP[m.advertiserId];
    return {
      advertiser: adv?.name ?? m.advertiserId,
      matchedText: m.matchedText,
      mentionType: TYPE_META[m.type].label,
      show: v ? (SHOW_MAP[v.showId]?.name ?? "—") : "—",
      videoTitle: v?.title ?? m.videoId,
      videoDate: v ? fmtDate(v.publishedAt) : "—",
      timestamp: fmtTime(m.tStart),
      startSeconds: m.tStart,
      confidence: `${Math.round(m.confidence * 100)}%`,
      status: statusLabel(statuses[m.id]),
      youtubeLink: watchUrl(m.videoId, m.tStart),
      transcriptExcerpt: m.line.text,
    };
  });
}

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

export function toCsv(rows: ExportRow[]): string {
  const header = [
    "Advertiser",
    "Matched Text",
    "Mention Type",
    "Show",
    "Video Title",
    "Video Date",
    "Timestamp",
    "Start (seconds)",
    "Confidence",
    "Review Status",
    "YouTube Link",
    "Transcript Excerpt",
  ];
  const lines = rows.map((r) =>
    [
      r.advertiser,
      r.matchedText,
      r.mentionType,
      r.show,
      r.videoTitle,
      r.videoDate,
      r.timestamp,
      r.startSeconds,
      r.confidence,
      r.status,
      r.youtubeLink,
      r.transcriptExcerpt,
    ]
      .map(csvCell)
      .join(","),
  );
  return [header.map(csvCell).join(","), ...lines].join("\r\n");
}

export function toJson(rows: ExportRow[]): string {
  return JSON.stringify(
    {
      tool: "AdLume — Advertiser Mention Intelligence",
      exported_at: new Date().toISOString(),
      record_count: rows.length,
      mentions: rows.map((r) => ({
        advertiser: r.advertiser,
        matched_text: r.matchedText,
        mention_type: r.mentionType,
        show: r.show,
        video_title: r.videoTitle,
        video_date: r.videoDate,
        timestamp: r.timestamp,
        start_seconds: r.startSeconds,
        confidence: r.confidence,
        review_status: r.status,
        youtube_link: r.youtubeLink,
        transcript_excerpt: r.transcriptExcerpt,
      })),
    },
    null,
    2,
  );
}

/** Download a string payload. CSV payloads automatically get a UTF-8 BOM so Excel opens them correctly. */
export function download(filename: string, content: string, mime: string): void {
  const payload =
    mime.includes("csv") && !content.startsWith("\uFEFF") ? "\uFEFF" + content : content;
  const blob = new Blob([payload], { type: `${mime};charset=utf-8` });
  downloadBlob(filename, blob);
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}
