import JSZip from "jszip";
import { ADVERTISER_MAP, Mention, SHOW_MAP, TYPE_META, VideoItem } from "../data/core";
import { downloadBlob } from "./export";
import { fmtTime, watchUrl } from "./youtube";

/* -------------------------------------------------------------------------- */
/*  Clip computation — every mention becomes an exportable clip window        */
/* -------------------------------------------------------------------------- */

export interface ClipSpec {
  id: string;
  mentionId: string;
  videoId: string;
  videoTitle: string;
  showName: string;
  advertiserId: string;
  advertiserName: string;
  typeLabel: string;
  matchedText: string;
  start: number;
  end: number;
  name: string;
  sourceUrl: string;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const pad2 = (n: number) => String(n).padStart(2, "0");

const mmss = (s: number) => fmtTime(s).replace(/:/g, "-");

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Estimate clip end from the spoken sentence length. */
function sentenceDuration(text: string): number {
  const words = text.split(/\s+/).length;
  return clamp(words * 0.42, 6, 16);
}

export function clipsFromMentions(
  mentions: Mention[],
  videoMap: Record<string, VideoItem>,
  padBefore = 6,
  padAfter = 5,
): ClipSpec[] {
  const sorted = [...mentions].sort(
    (a, b) => a.videoId.localeCompare(b.videoId) || a.tStart - b.tStart,
  );
  return sorted.map((m, i) => {
    const v = videoMap[m.videoId];
    const dur = v?.durationSec ?? m.tStart + 30;
    const start = clamp(Math.round(m.tStart - padBefore), 0, Math.max(0, dur - 4));
    const end = clamp(
      Math.round(m.tStart + sentenceDuration(m.line.text) + padAfter),
      start + 4,
      dur,
    );
    const adv = ADVERTISER_MAP[m.advertiserId];
    const name = `${pad2(i + 1)}_${slug(adv?.name ?? m.advertiserId)}_${
      v ? slug(SHOW_MAP[v.showId]?.name ?? "episode") : "episode"
    }_${mmss(start)}`;
    return {
      id: `clip-${m.id}`,
      mentionId: m.id,
      videoId: m.videoId,
      videoTitle: v?.title ?? m.videoId,
      showName: v ? (SHOW_MAP[v.showId]?.name ?? "—") : "—",
      advertiserId: m.advertiserId,
      advertiserName: adv?.name ?? m.advertiserId,
      typeLabel: TYPE_META[m.type].label,
      matchedText: m.matchedText,
      start,
      end,
      name,
      sourceUrl: watchUrl(m.videoId),
    };
  });
}

export const clipDuration = (c: ClipSpec) => Math.max(0, c.end - c.start);

export const totalClipSeconds = (clips: ClipSpec[]) =>
  clips.reduce((s, c) => s + clipDuration(c), 0);

/** Rough MP4 (h264, crf 20) size estimate in MB. */
export const estimatedClipSizeMB = (clips: ClipSpec[]) =>
  Math.max(1, Math.round(totalClipSeconds(clips) * 0.31));

/* -------------------------------------------------------------------------- */
/*  Manifests                                                                 */
/* -------------------------------------------------------------------------- */

const escXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

export function buildManifestCsv(clips: ClipSpec[]): string {
  const header = [
    "Clip File",
    "Advertiser",
    "Mention Type",
    "Matched Text",
    "Show",
    "Source Video",
    "Source In (s)",
    "Source Out (s)",
    "Duration (s)",
    "Source URL",
  ];
  const lines = clips.map((c) =>
    [
      `${c.name}.mp4`,
      c.advertiserName,
      c.typeLabel,
      c.matchedText,
      c.showName,
      c.videoTitle,
      c.start,
      c.end,
      clipDuration(c),
      c.sourceUrl,
    ]
      .map(csvCell)
      .join(","),
  );
  return [header.map(csvCell).join(","), ...lines].join("\r\n");
}

export function buildManifestJson(clips: ClipSpec[]): string {
  return JSON.stringify(
    {
      tool: "AdLume Clip Studio",
      generated_at: new Date().toISOString(),
      clip_count: clips.length,
      clips: clips.map((c) => ({
        file: `${c.name}.mp4`,
        advertiser: c.advertiserName,
        mention_type: c.typeLabel,
        matched_text: c.matchedText,
        show: c.showName,
        source_video: c.videoTitle,
        source_video_id: c.videoId,
        source_url: c.sourceUrl,
        source_in_seconds: c.start,
        source_out_seconds: c.end,
        duration_seconds: clipDuration(c),
      })),
    },
    null,
    2,
  );
}

/* -------------------------------------------------------------------------- */
/*  FCPXML — importable in Final Cut Pro / Premiere / Resolve                 */
/* -------------------------------------------------------------------------- */

const rational = (s: number) => `${Math.round(s * 1000)}/1000s`;

export function buildFcpXml(clips: ClipSpec[]): string {
  const videoIds = [...new Set(clips.map((c) => c.videoId))];
  const assets = videoIds
    .map(
      (id, i) => `    <asset id="va${i + 1}" name="source-${escXml(id)}" src="file:///REPLACE_WITH_LOCAL_PATH/${id}.mp4" start="0s" duration="28800s" hasVideo="1" hasAudio="1" format="r1" audioSources="1" audioChannels="2"/>`,
    )
    .join("\n");

  let timelineOffset = 0;
  const spine = clips
    .map((c) => {
      const assetRef = `va${videoIds.indexOf(c.videoId) + 1}`;
      const el = `            <asset-clip name="${escXml(c.name)}" ref="${assetRef}" offset="${rational(
        timelineOffset,
      )}" start="${rational(c.start)}" duration="${rational(clipDuration(c))}" format="r1" tcFormat="NDF" audioRole="dialogue"/>`;
      timelineOffset += clipDuration(c);
      return el;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.10">
  <resources>
    <format id="r1" name="FFVideoFormat1080p30" frameDuration="1/30s" width="1920" height="1080"/>
${assets}
  </resources>
  <library location="file:///REPLACE_WITH_LOCAL_PATH/AdLume%20Clips/">
    <event name="AdLume Mention Clips">
      <project name="AdLume Mentions Timeline — ${clips.length} clips">
        <sequence format="r1" duration="${rational(timelineOffset)}" tcStart="0s" tcFormat="NDF">
          <spine>
${spine}
          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>
`;
}

/* -------------------------------------------------------------------------- */
/*  CMX 3600 EDL                                                              */
/* -------------------------------------------------------------------------- */

function timecode(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${pad2(h)}:${pad2(m)}:${pad2(sec)}:00`;
}

export function buildEdl(clips: ClipSpec[]): string {
  let recOffset = 0;
  const body = clips
    .map((c, i) => {
      const dur = clipDuration(c);
      const line = `${pad3(i + 1)}  AX       V     C        ${timecode(c.start)} ${timecode(
        c.end,
      )} ${timecode(recOffset)} ${timecode(recOffset + dur)}
* FROM CLIP NAME: ${c.name.toUpperCase()}.MP4
* ADVERTISER: ${c.advertiserName.toUpperCase()} | TYPE: ${c.typeLabel.toUpperCase()} | MATCH: "${c.matchedText.toUpperCase()}"
* SOURCE: ${c.sourceUrl}`;
      recOffset += dur;
      return line;
    })
    .join("\n\n");
  return `TITLE:   ADLUME MENTION CLIPS
FCM: NON-DROP FRAME

${body}
`;

  function pad3(n: number) {
    return String(n).padStart(3, "0");
  }
}

/* -------------------------------------------------------------------------- */
/*  ffmpeg scripts — render real clips locally                                */
/* -------------------------------------------------------------------------- */

export function buildFfmpegScripts(clips: ClipSpec[]): { sh: string; bat: string } {
  const videoIds = [...new Set(clips.map((c) => c.videoId))];
  const downloads = videoIds
    .map(
      (id) =>
        `yt-dlp -f "bv*[height<=1080]+ba/b[height<=1080]" --merge-output-format mp4 -o "${id}.mp4" "https://www.youtube.com/watch?v=${id}"`,
    )
    .join("\n");

  const cutLines = clips.map(
    (c) =>
      `ffmpeg -y -ss ${c.start.toFixed(3)} -i "${c.videoId}.mp4" -t ${clipDuration(c).toFixed(
        3,
      )} -c:v libx264 -preset veryfast -crf 20 -c:a aac -movflags +faststart "clips/${c.name}.mp4"`,
  );

  const sh = `#!/usr/bin/env bash
# AdLume Clip Studio — automatic mention clip extractor
# Requires: yt-dlp (https://github.com/yt-dlp/yt-dlp) and ffmpeg
set -e

echo "Step 1/2 — downloading ${videoIds.length} source video(s)…"
${downloads}

mkdir -p clips
echo "Step 2/2 — cutting ${clips.length} clips…"
${cutLines.join("\n")}

echo "Done — ${clips.length} clips written to ./clips"
`;

  const bat = [
    "@echo off",
    "REM AdLume Clip Studio — automatic mention clip extractor (Windows)",
    "REM Requires: yt-dlp and ffmpeg on PATH",
    "",
    `echo Step 1/2 - downloading ${videoIds.length} source video(s)...`,
    ...downloads.split("\n"),
    "",
    "if not exist clips mkdir clips",
    `echo Step 2/2 - cutting ${clips.length} clips...`,
    ...cutLines,
    "",
    `echo Done - ${clips.length} clips written to .\\clips`,
    "pause",
  ].join("\r\n");

  return { sh, bat };
}

export function buildReadme(clips: ClipSpec[]): string {
  const lines = clips
    .map(
      (c, i) =>
        `${String(i + 1).padStart(3, " ")}. ${c.name}.mp4\n     ${c.advertiserName} — ${c.typeLabel} · "${c.matchedText}" @ ${fmtTime(
          c.start,
        )}–${fmtTime(c.end)} of "${c.videoTitle}"`,
    )
    .join("\n");

  return `ADLUME CLIP STUDIO — MENTION CLIP PACKAGE
=========================================

This package turns detected advertiser mentions into real video clips.

CONTENTS
--------
  clips.csv          Spreadsheet manifest of all ${clips.length} clips
  clips.json         Machine-readable manifest
  project.fcpxml     Final Cut Pro / Premiere / Resolve timeline (all clips strung out)
  edit.edl           CMX 3600 edit decision list
  cut.sh             Bash script — downloads sources (yt-dlp) and renders MP4 clips (ffmpeg)
  cut.bat            Windows equivalent
  README.txt         This file

HOW TO RENDER THE CLIPS
-----------------------
1. Install yt-dlp and ffmpeg.
2. Run:  bash cut.sh      (or double-click cut.bat on Windows)
3. Each clip lands in ./clips as a trimmed, fast-start MP4.

HOW TO USE THE TIMELINE
-----------------------
Import project.fcpxml into Final Cut Pro, Premiere Pro or DaVinci Resolve.
Place the downloaded source MP4s next to the project file and relink if asked —
the edit points are frame-accurate to the mention timestamps.

CLIP LIST
---------
${lines}

Generated by AdLume — Advertiser Mention Intelligence (demo dataset)
${new Date().toISOString()}
`;
}

/* -------------------------------------------------------------------------- */
/*  ZIP bundle                                                                */
/* -------------------------------------------------------------------------- */

export async function downloadClipPackage(clips: ClipSpec[]): Promise<void> {
  const zip = new JSZip();
  const root = zip.folder(`adlume-clips-${new Date().toISOString().slice(0, 10)}`)!;
  root.file("clips.csv", buildManifestCsv(clips));
  root.file("clips.json", buildManifestJson(clips));
  root.file("project.fcpxml", buildFcpXml(clips));
  root.file("edit.edl", buildEdl(clips));
  const { sh, bat } = buildFfmpegScripts(clips);
  root.file("cut.sh", sh);
  root.file("cut.bat", bat);
  root.file("README.txt", buildReadme(clips));
  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(`adlume-clips-${new Date().toISOString().slice(0, 10)}.zip`, blob);
}
