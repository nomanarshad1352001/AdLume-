import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Archive,
  BadgeCheck,
  Braces,
  Building2,
  Download,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Flag,
  History,
  Link2,
  Quote,
  ScrollText,
  Timer,
  Trash2,
} from "lucide-react";
import { downloadReport } from "../lib/report";
import { relTime } from "../lib/youtube";
import { ReportKind, useApp } from "../state/AppContext";
import { EmptyState } from "../components/ui";

const KIND_META: Record<ReportKind, { icon: typeof FileText; label: string; color: string; soft: string }> = {
  csv: { icon: FileSpreadsheet, label: "CSV", color: "#A8763E", soft: "#F4E9D4" },
  json: { icon: Braces, label: "JSON", color: "#5B7C99", soft: "#E3EAF1" },
  html: { icon: FileText, label: "Report", color: "#52796F", soft: "#E4EDE7" },
  zip: { icon: Archive, label: "Clip package", color: "#8E6C88", soft: "#EFE6EE" },
  clipboard: { icon: Link2, label: "Links", color: "#998D7E", soft: "#EFEADF" },
  edit: { icon: FileCode2, label: "Edit file", color: "#B5654A", soft: "#F6E5DE" },
};

export default function Reports() {
  const { mentions, videoMap, statuses, reportLog, logReport, clearReportLog, notify } = useApp();
  const navigate = useNavigate();

  const counts = useMemo(() => {
    const by = { csv: 0, json: 0, html: 0, zip: 0, clipboard: 0, edit: 0 } as Record<ReportKind, number>;
    reportLog.forEach((r) => by[r.kind]++);
    return {
      total: reportLog.length,
      records: reportLog.reduce((s, r) => s + r.records, 0),
      by,
    };
  }, [reportLog]);

  const thirtyDaysAgo = Date.now() - 30 * 864e5;

  const presets = useMemo(
    () => [
      {
        id: "feldman",
        icon: Building2,
        title: "Feldman Automotive",
        desc: "Everything Feldman, every alias — the full coverage report.",
        mentions: mentions.filter((m) => m.advertiserId === "feldman"),
      },
      {
        id: "flagged",
        icon: Flag,
        title: "Flagged for review",
        desc: "Mentions a human flagged — the QA queue, in one file.",
        mentions: mentions.filter((m) => statuses[m.id] === "flagged"),
      },
      {
        id: "adreads",
        icon: Quote,
        title: "Paid reads only",
        desc: "Ad reads and sponsored segments — billable inventory.",
        mentions: mentions.filter((m) => m.type === "ad_read" || m.type === "sponsored_segment"),
      },
      {
        id: "recent",
        icon: Timer,
        title: "Last 30 days",
        desc: "Fresh mentions from the past month of episodes.",
        mentions: mentions.filter((m) => {
          const v = videoMap[m.videoId];
          return v && new Date(v.publishedAt).getTime() > thirtyDaysAgo;
        }),
      },
    ],
    [mentions, statuses, videoMap, thirtyDaysAgo],
  );

  const runPreset = (p: (typeof presets)[number]) => {
    if (!p.mentions.length) {
      notify("Nothing to export yet", `${p.title} has no matching mentions right now.`);
      return;
    }
    const title = `${p.title} — Mention Report`;
    downloadReport(p.mentions, videoMap, statuses, {
      title,
      subtitle: `${p.mentions.length} mentions · preset report`,
      scope: [`Preset: ${p.title}`, p.desc],
    });
    notify("Preset report downloaded", `${p.mentions.length} mentions · ${p.title}`);
    logReport("html", `${p.title} — Mention Report`, p.mentions.length, [`Preset: ${p.title}`]);
  };

  return (
    <div className="space-y-6">
      {/* ---------------------------------- header ---------------------------------- */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-2">Reporting</div>
          <h1 className="serif-tight text-[clamp(26px,3vw,32px)] font-semibold leading-tight text-ink">
            Reports & export history
          </h1>
          <p className="mt-2 max-w-xl text-[13.5px] text-ink-soft">
            One-click preset reports for your common deliverables, plus a full audit trail of every
            export generated in this workspace.
          </p>
        </div>
      </div>

      {/* ---------------------------------- stat row --------------------------------- */}
      <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        {[
          { icon: History, label: "exports generated", value: String(counts.total) },
          { icon: Quote, label: "records exported", value: String(counts.records) },
          { icon: FileText, label: "branded reports", value: String(counts.by.html) },
          { icon: Archive, label: "clip packages", value: String(counts.by.zip) },
        ]
          .map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.45 }}
              className="card flex items-center gap-3.5 p-5"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-champagne-soft text-gold-deep">
                <s.icon size={17} />
              </span>
              <div>
                <div className="mono text-[22px] font-semibold leading-none text-ink">{s.value}</div>
                <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                  {s.label}
                </div>
              </div>
            </motion.div>
          ))}
      </div>

      {/* --------------------------------- presets ---------------------------------- */}
      <div>
        <div className="eyebrow mb-3">One-click presets</div>
        <div className="grid gap-4 sm:grid-cols-2">
          {presets.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * i + 0.1, duration: 0.45 }}
              className="card group flex items-center gap-4 p-5 transition-shadow hover:shadow-lift"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-champagne to-champagne-soft text-gold-deep ring-1 ring-gold-tint/50">
                <p.icon size={19} strokeWidth={1.9} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-[14.5px] font-semibold text-ink">{p.title}</h3>
                  <span className="mono rounded-full bg-champagne-soft px-2 py-0.5 text-[10.5px] font-semibold text-gold-deep">
                    {p.mentions.length}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[12px] text-ink-faint">{p.desc}</p>
              </div>
              <button
                onClick={() => runPreset(p)}
                disabled={!p.mentions.length}
                className="btn-gold shrink-0 !px-3.5 !py-2 text-[12px]"
                title="Download branded HTML report"
              >
                <Download size={14} /> Report
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* --------------------------------- history ---------------------------------- */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line-soft px-6 py-4">
          <div>
            <div className="eyebrow mb-1">Audit trail</div>
            <h2 className="serif-tight text-[20px] font-semibold text-ink">Export history</h2>
          </div>
          {reportLog.length > 0 && (
            <button
              onClick={() => {
                clearReportLog();
                notify("History cleared", "Export audit trail emptied.");
              }}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-faint transition hover:text-terra"
            >
              <Trash2 size={13} /> Clear
            </button>
          )}
        </div>

        {reportLog.length === 0 ? (
          <div className="px-6 py-10">
            <EmptyState
              icon={ScrollText}
              title="No exports yet"
              body="Export a CSV, JSON, HTML report or clip package from anywhere in the app and it'll be recorded here automatically."
              action={
                <button onClick={() => navigate("/mentions")} className="btn-ghost text-[13px]">
                  Go to Mention Explorer
                </button>
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-line-soft">
            {reportLog.map((r) => {
              const meta = KIND_META[r.kind];
              return (
                <li key={r.id} className="flex items-center gap-4 px-6 py-3.5 transition hover:bg-cream/70">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: meta.soft, color: meta.color }}
                  >
                    <meta.icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-ink">{r.title}</div>
                    <div className="mt-0.5 truncate text-[11px] text-ink-faint">
                      {r.scope.slice(0, 2).join(" · ")}
                      {r.scope.length > 2 ? " …" : ""}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="mono text-[12px] font-semibold text-ink">{r.records} rec.</div>
                    <div className="text-[10.5px] text-ink-faint">{relTime(r.at)}</div>
                  </div>
                  <span
                    className="hidden shrink-0 rounded-full px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.1em] sm:block"
                    style={{ backgroundColor: meta.soft, color: meta.color }}
                  >
                    {meta.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="flex items-center justify-center gap-2 text-center text-[11.5px] text-ink-faint">
        <BadgeCheck size={13} className="text-sage" />
        Exports are generated fully in-browser — the audit trail is stored locally in this workspace.
      </p>
    </div>
  );
}
