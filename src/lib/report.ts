import { Mention, VideoItem } from "../data/core";
import { splitOnTerm } from "../data/generator";
import { ExportRow, mentionsToRows, StatusMap, download } from "./export";
import { fmtDate } from "./youtube";

export interface ReportMeta {
  title: string;
  subtitle: string;
  scope: string[];
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function highlighted(excerpt: string, term: string): string {
  const parts = splitOnTerm(excerpt, term);
  if (parts.length === 1) return esc(excerpt);
  return `${esc(parts[0])}<mark>${esc(parts[1])}</mark>${esc(parts[2])}`;
}

export function buildReportHtml(rows: ExportRow[], meta: ReportMeta): string {
  const advertisers = new Set(rows.map((r) => r.advertiser));
  const videos = new Set(rows.map((r) => r.videoTitle));
  const verified = rows.filter((r) => r.status === "Verified").length;

  const scopeRows = meta.scope
    .map((s) => `<span class="scope-chip">${esc(esc(s))}</span>`)
    .join("");

  const tableRows = rows
    .map((r, i) => {
      const statusCls =
        r.status === "Verified" ? "st-v" : r.status === "Flagged for review" ? "st-f" : "st-u";
      return `
      <tr>
        <td class="idx mono">${i + 1}</td>
        <td>
          <div class="adv">${esc(esc(r.advertiser))}</div>
          <div class="alias">spoken as “${esc(esc(r.matchedText))}”</div>
        </td>
        <td><span class="type">${esc(esc(r.mentionType))}</span></td>
        <td>
          <div>${esc(esc(r.show))}</div>
          <div class="muted">${esc(esc(r.videoTitle))} · ${esc(esc(r.videoDate))}</div>
        </td>
        <td><a class="ts mono" href="${esc(r.youtubeLink)}" target="_blank">${esc(r.timestamp)}</a></td>
        <td class="excerpt">…${highlighted(r.transcriptExcerpt, r.matchedText)}…</td>
        <td class="mono">${esc(r.confidence)}</td>
        <td><span class="st ${statusCls}">${esc(esc(r.status))}</span></td>
      </tr>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(esc(meta.title))} · AdLume</title>
<style>
  :root { --ink:#211a13; --soft:#5d554c; --faint:#998d7e; --line:#e6ddcd; --gold:#a8763e; --goldlight:#dfc594; --cream:#fbf9f4; --porcelain:#f6f2ea; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--porcelain); color:var(--ink); font-family: -apple-system, "Segoe UI", Inter, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
  .page { max-width: 1080px; margin: 0 auto; padding: 48px 40px 64px; background:#fff; min-height:100vh; }
  .brand { display:flex; align-items:center; gap:12px; }
  .mark { width:38px; height:38px; border-radius:10px; background:var(--ink); display:flex; align-items:center; justify-content:center; }
  .mark span { width:14px; height:14px; transform:rotate(45deg); background:linear-gradient(135deg,#dfc594,#a8763e); border-radius:2px; }
  .brand b { font-family: Georgia, "Times New Roman", serif; font-size:22px; font-weight:600; letter-spacing:-0.01em; }
  .brand small { display:block; font-size:8.5px; letter-spacing:0.3em; text-transform:uppercase; color:var(--faint); margin-top:2px; }
  header { display:flex; justify-content:space-between; align-items:flex-start; gap:24px; border-bottom:1px solid var(--line); padding-bottom:28px; }
  h1 { font-family: Georgia, serif; font-size:30px; font-weight:600; margin:26px 0 6px; letter-spacing:-0.01em; }
  .sub { color:var(--soft); font-size:14px; }
  .scopes { display:flex; flex-wrap:wrap; gap:8px; margin-top:16px; }
  .scope-chip { font-size:11.5px; font-weight:600; border:1px solid var(--line); border-radius:999px; padding:5px 12px; color:var(--soft); background:var(--cream); }
  .summary { display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; margin:28px 0 30px; }
  .stat { border:1px solid var(--line); border-radius:12px; padding:14px 16px; background:var(--cream); }
  .stat b { font-family:"Courier New", monospace; font-size:22px; display:block; }
  .stat span { font-size:9.5px; text-transform:uppercase; letter-spacing:0.14em; color:var(--faint); font-weight:700; }
  table { width:100%; border-collapse:collapse; font-size:12.5px; }
  th { text-align:left; font-size:9.5px; text-transform:uppercase; letter-spacing:0.14em; color:var(--faint); padding:10px 10px; border-bottom:1.5px solid var(--line); }
  td { padding:12px 10px; border-bottom:1px solid #efe8da; vertical-align:top; }
  tr:first-child td { border-top:none; }
  .idx { color:var(--faint); width:28px; }
  .adv { font-weight:700; }
  .alias { color:var(--faint); font-size:11px; font-style:italic; margin-top:2px; }
  .type { font-size:10px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; background:#f4e9d4; color:#a8763e; border-radius:999px; padding:3px 9px; white-space:nowrap; }
  .muted { color:var(--faint); font-size:11px; margin-top:2px; max-width:220px; }
  .ts { display:inline-block; color:var(--gold); font-weight:700; text-decoration:none; border-bottom:1px solid var(--goldlight); padding-bottom:1px; white-space:nowrap; }
  .mono { font-family:"Courier New", monospace; }
  .excerpt { color:var(--soft); line-height:1.55; max-width:300px; }
  mark { background: linear-gradient(to top, rgba(223,197,148,.85) 40%, rgba(223,197,148,.3) 90%, transparent 90%); padding:0 2px; border-radius:2px; font-weight:700; color:var(--ink); }
  .st { font-size:10px; font-weight:700; border-radius:999px; padding:3px 9px; white-space:nowrap; }
  .st-v { background:#e4ede7; color:#52796f; } .st-f { background:#f6e5de; color:#b5654a; } .st-u { background:#efeadf; color:#998d7e; }
  footer { margin-top:36px; padding-top:18px; border-top:1px solid var(--line); display:flex; justify-content:space-between; color:var(--faint); font-size:11px; }
  .print-btn { border:none; cursor:pointer; background:var(--ink); color:#fff; font-weight:700; font-size:13px; border-radius:10px; padding:10px 18px; }
  .print-btn:hover { background:#332a20; }
  @media print {
    body { background:#fff; }
    .page { padding:0; }
    .print-btn { display:none; }
    tr, .stat { break-inside: avoid; }
    a { color:var(--gold); }
  }
</style>
</head>
<body>
<div class="page">
  <header>
    <div class="brand">
      <div class="mark"><span></span></div>
      <div><b>AdLume</b><small>Mention Intelligence</small></div>
    </div>
    <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  </header>

  <h1>${esc(esc(meta.title))}</h1>
  <div class="sub">${esc(esc(meta.subtitle))} · Generated ${esc(fmtDate(new Date().toISOString()))} by AdLume</div>
  <div class="scopes">${scopeRows}</div>

  <div class="summary">
    <div class="stat"><b>${rows.length}</b><span>mentions</span></div>
    <div class="stat"><b>${advertisers.size}</b><span>advertisers</span></div>
    <div class="stat"><b>${videos.size}</b><span>source videos</span></div>
    <div class="stat"><b>${verified}</b><span>human verified</span></div>
  </div>

  <table>
    <thead>
      <tr><th>#</th><th>Advertiser</th><th>Type</th><th>Show · Episode</th><th>Timestamp</th><th>Transcript</th><th>Conf.</th><th>Status</th></tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>

  <footer>
    <span>AdLume — Advertiser Mention Intelligence · demo dataset</span>
    <span>${rows.length} records · all timestamps link directly to YouTube</span>
  </footer>
</div>
</body>
</html>`;
}

export function downloadReport(
  mentions: Mention[],
  videoMap: Record<string, VideoItem>,
  statuses: StatusMap,
  meta: ReportMeta,
): void {
  const rows = mentionsToRows(mentions, videoMap, statuses);
  const html = buildReportHtml(rows, meta);
  const name = `adlume-report-${new Date().toISOString().slice(0, 10)}.html`;
  download(name, html, "text/html");
}
