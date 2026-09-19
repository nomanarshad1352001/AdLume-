import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Clock3,
  Flag,
  Gauge,
  Quote,
  ScanSearch,
  TrendingUp,
} from "lucide-react";
import {
  ADVERTISERS,
  ADVERTISER_MAP,
  IMG,
  SHOW_MAP,
  TYPE_META,
  TYPE_ORDER,
} from "../data/core";
import { fmtDate, fmtTime, relTime } from "../lib/youtube";
import { useApp } from "../state/AppContext";
import { Highlight, Monogram, SectionHead, Sparkline, TypeBadge } from "../components/ui";
import { Avatar, USER_AVATAR } from "../components/brand";
import { cn } from "../utils/cn";

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.06 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
});

export default function Dashboard() {
  const { user, videos, mentions, videoMap, statuses } = useApp();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const now = Date.now();
    const month = mentions.filter(
      (m) => now - new Date(videoMap[m.videoId]?.publishedAt ?? 0).getTime() < 30 * 864e5,
    );
    const advIds = new Set(mentions.map((m) => m.advertiserId));
    const avg = mentions.length
      ? mentions.reduce((s, m) => s + m.confidence, 0) / mentions.length
      : 0;
    // 14-day activity buckets keyed by video publish date
    const buckets = Array.from({ length: 14 }, () => 0);
    videos.forEach((v) => {
      const d = Math.floor((now - new Date(v.publishedAt).getTime()) / 864e5);
      if (d >= 0 && d < 14) buckets[13 - d] += mentions.filter((m) => m.videoId === v.id).length;
    });
    return {
      total: mentions.length,
      month: month.length,
      advertisers: advIds.size,
      avgConf: Math.round(avg * 100),
      buckets,
    };
  }, [mentions, videos, videoMap]);

  const byAdvertiser = useMemo(() => {
    const counts = new Map<string, number>();
    mentions.forEach((m) => counts.set(m.advertiserId, (counts.get(m.advertiserId) ?? 0) + 1));
    return [...counts.entries()]
      .map(([id, n]) => ({ adv: ADVERTISER_MAP[id], n }))
      .filter((x) => x.adv)
      .sort((a, b) => b.n - a.n)
      .slice(0, 6);
  }, [mentions]);

  const byType = useMemo(() => {
    const counts = new Map<string, number>();
    mentions.forEach((m) => counts.set(m.type, (counts.get(m.type) ?? 0) + 1));
    return TYPE_ORDER.map((t) => ({ type: t, n: counts.get(t) ?? 0 }));
  }, [mentions]);

  const recent = useMemo(() => {
    return [...mentions]
      .sort((a, b) => {
        const da = new Date(videoMap[a.videoId]?.publishedAt ?? 0).getTime();
        const db = new Date(videoMap[b.videoId]?.publishedAt ?? 0).getTime();
        return db - da || a.tStart - b.tStart;
      })
      .slice(0, 6);
  }, [mentions, videoMap]);

  const feldmanCount = mentions.filter((m) => m.advertiserId === "feldman").length;
  const maxBar = byAdvertiser[0]?.n ?? 1;

  const flaggedCount = mentions.filter((m) => statuses[m.id] === "flagged").length;
  const verifiedCount = mentions.filter((m) => statuses[m.id] === "verified").length;
  const unreviewedCount = mentions.length - flaggedCount - verifiedCount;

  // donut geometry
  const R = 52;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const donut = byType
    .filter((t) => t.n > 0)
    .map((t) => {
      const frac = t.n / (stats.total || 1);
      const seg = { ...t, dash: frac * C, gap: C - frac * C, off: offset };
      offset += frac * C;
      return seg;
    });

  const firstName = user?.name.split(" ")[0] ?? "there";

  return (
    <div className="space-y-8">
      {/* -------------------------------- greeting -------------------------------- */}
      <motion.div {...stagger(0)} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-2">{fmtDate(new Date().toISOString())}</div>
          <h1 className="serif-tight text-[clamp(28px,3.4vw,36px)] font-semibold leading-tight text-ink">
            Good to see you, <span className="italic font-medium text-gold-deep">{firstName}.</span>
          </h1>
          <p className="mt-2 text-[14px] text-ink-soft">
            {stats.month} new mentions surfaced in the last 30 days across {videos.length} episodes.
          </p>
        </div>
        <Link to="/analyze" className="btn-gold">
          <ScanSearch size={16} />
          Analyze a video
        </Link>
      </motion.div>

      {/* -------------------------------- stat cards ------------------------------- */}
      <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        {[
          { icon: Quote, label: "Mentions this month", value: String(stats.month), delta: "+12% vs. prior", spark: stats.buckets },
          { icon: Building2, label: "Advertisers on air", value: `${stats.advertisers} / ${ADVERTISERS.length}`, delta: "2 pending approval" },
          { icon: Clock3, label: "Episodes analyzed", value: String(videos.length), delta: "+3 this week" },
          { icon: Gauge, label: "Avg. match confidence", value: `${stats.avgConf}%`, delta: "±1s timestamp precision" },
        ].map((s, i) => (
          <motion.div key={s.label} {...stagger(i + 1)} className="card group p-5">
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-champagne-soft text-gold-deep transition group-hover:shadow-gold">
                <s.icon size={16} strokeWidth={2} />
              </span>
              {s.spark && <Sparkline points={s.spark} />}
            </div>
            <div className="mono mt-4 text-[30px] font-semibold leading-none text-ink">{s.value}</div>
            <div className="mt-1.5 text-[12.5px] font-medium text-ink-soft">{s.label}</div>
            <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-sage">
              <TrendingUp size={12} />
              {s.delta}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        {/* ----------------------------- advertiser bars ----------------------------- */}
        <motion.div {...stagger(5)} className="card p-6">
          <SectionHead
            eyebrow="Leaderboard"
            title="Mentions by advertiser"
            action={<Link to="/advertisers" className="link-gold text-[12.5px]">Directory <ArrowUpRight size={13} /></Link>}
          />
          <div className="space-y-3.5">
            {byAdvertiser.map(({ adv, n }, i) => (
              <button
                key={adv.id}
                onClick={() => navigate(`/mentions?advertiser=${adv.id}`)}
                className="group flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition hover:bg-champagne-soft"
              >
                <span className="mono w-[86px] shrink-0 truncate text-[12px] font-semibold text-ink-soft sm:w-[150px]">
                  <span className="hidden sm:inline">{adv.name}</span>
                  <span className="sm:hidden">{adv.monogram}</span>
                </span>
                <span className="h-7 flex-1 overflow-hidden rounded-lg bg-line-soft/70">
                  <motion.span
                    initial={{ width: 0 }}
                    animate={{ width: `${(n / maxBar) * 100}%` }}
                    transition={{ delay: 0.3 + i * 0.07, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    className="block h-full rounded-lg"
                    style={{ background: `linear-gradient(90deg, ${adv.color}66, ${adv.color})` }}
                  />
                </span>
                <span className="mono w-7 text-right text-[13px] font-semibold text-ink">{n}</span>
              </button>
            ))}
          </div>

          {/* donut */}
          <div className="mt-7 flex flex-wrap items-center gap-6 border-t border-line-soft pt-6">
            <div className="relative h-[130px] w-[130px] shrink-0">
              <svg viewBox="0 0 130 130" className="h-full w-full -rotate-90">
                <circle cx="65" cy="65" r={R} fill="none" stroke="#EFE8DA" strokeWidth="13" />
                {donut.map((seg) => (
                  <motion.circle
                    key={seg.type}
                    cx="65" cy="65" r={R} fill="none"
                    stroke={TYPE_META[seg.type].color}
                    strokeWidth="13"
                    strokeDasharray={`${seg.dash} ${seg.gap}`}
                    strokeDashoffset={-seg.off}
                    strokeLinecap="butt"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="mono text-[22px] font-semibold">{stats.total}</span>
                <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-faint">mentions</span>
              </div>
            </div>
            <div className="grid min-w-[190px] flex-1 gap-2">
              {byType.filter((t) => t.n > 0).map((t) => (
                <div key={t.type} className="flex items-center gap-2.5 text-[12.5px]">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TYPE_META[t.type].color }} />
                  <span className="flex-1 font-medium text-ink-soft">{TYPE_META[t.type].label}</span>
                  <span className="mono font-semibold text-ink">{t.n}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ------------------------------ recent mentions ---------------------------- */}
        <motion.div {...stagger(6)} className="card flex flex-col p-6">
          <SectionHead
            eyebrow="Fresh off the air"
            title="Recent mentions"
            action={<Link to="/mentions" className="link-gold text-[12.5px]">All <ArrowUpRight size={13} /></Link>}
          />
          <div className="flex-1 space-y-1.5">
            {recent.map((m) => {
              const v = videoMap[m.videoId];
              const adv = ADVERTISER_MAP[m.advertiserId];
              if (!v || !adv) return null;
              return (
                <Link
                  key={m.id}
                  to={`/mentions?video=${m.videoId}`}
                  className="group flex items-center gap-3 rounded-xl border border-transparent px-2.5 py-2.5 transition hover:border-line hover:bg-cream"
                >
                  <Monogram advertiser={adv} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-medium text-ink-soft">
                      <Highlight text={m.line.text} term={m.matchedText} />
                    </div>
                    <div className="mt-0.5 text-[10.5px] text-ink-faint">
                      {SHOW_MAP[v.showId]?.name} · {relTime(v.publishedAt)}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="mono block text-[12.5px] font-semibold text-gold-deep">{fmtTime(m.tStart)}</span>
                    <span className="mt-0.5 inline-block"><TypeBadge type={m.type} className="!px-2 !py-0.5 !text-[9px]" /></span>
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* ------------------------------- review queue ------------------------------ */}
      <motion.div
        {...stagger(7)}
        className="card flex flex-wrap items-center gap-x-6 gap-y-3 border-terra/25 px-6 py-4"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-terra-soft text-terra">
          <Flag size={16} />
        </span>
        <div className="min-w-[160px] flex-1">
          <div className="text-[14px] font-semibold text-ink">Review queue</div>
          <div className="mt-0.5 text-[12px] text-ink-faint">
            <span className="font-semibold text-terra">{flaggedCount} flagged</span> ·{" "}
            <span className="font-semibold text-ink-soft">{unreviewedCount} awaiting verification</span>
            {verifiedCount > 0 && (
              <>
                {" · "}
                <span className="font-semibold text-sage">
                  <BadgeCheck size={11} className="mb-0.5 inline" /> {verifiedCount} verified
                </span>
              </>
            )}
          </div>
        </div>
        <div className="ms-auto flex items-center gap-2">
          <Link to="/mentions?status=flagged" className="btn-ghost !py-2 text-[12.5px]">
            <Flag size={13} /> Review flagged
          </Link>
          <Link to="/mentions?status=unreviewed" className="btn-ink !py-2 text-[12.5px]">
            <BadgeCheck size={14} /> Start QA round
          </Link>
        </div>
      </motion.div>

      {/* ------------------------------ feldman spotlight --------------------------- */}
      <motion.div {...stagger(7)} className="card overflow-hidden">
        <div className="grid md:grid-cols-[1fr_320px]">
          <div className="p-7">
            <div className="eyebrow mb-2 flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-gold" /> Advertiser spotlight
            </div>
            <h3 className="serif-tight text-[26px] font-semibold text-ink">Feldman Automotive</h3>
            <p className="mt-2 max-w-lg text-[13.5px] leading-relaxed text-ink-soft">
              Your most active partner — detected across the network under {ADVERTISER_MAP.feldman.aliases.length + 1}{" "}
              name variants. Every hit below is timestamped to the second.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {["Feldman Automotive", ...ADVERTISER_MAP.feldman.aliases].map((a) => (
                <span key={a} className="rounded-full border border-line bg-cream px-2.5 py-1 text-[11px] font-medium italic text-ink-soft">“{a}”</span>
              ))}
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button onClick={() => navigate("/mentions?advertiser=feldman")} className="btn-ink !py-2.5 text-[13px]">
                View all {feldmanCount} mentions <ArrowUpRight size={14} />
              </button>
              <div className="flex items-center gap-2 text-[12px] text-ink-faint">
                <Avatar name={user?.name ?? ""} src={USER_AVATAR} size={26} />
                Verified by {user?.name.split(" ")[0] ?? "you"}
              </div>
            </div>
          </div>
          <div className="relative hidden min-h-[220px] md:block">
            <img src={IMG.bannerChrome} alt="Feldman Automotive showroom detail" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-paper via-paper/20 to-transparent" />
            <div className={cn("absolute bottom-4 right-4 rounded-xl border border-white/40 bg-white/80 px-3.5 py-2 backdrop-blur")}>
              <span className="mono text-[15px] font-semibold text-ink">{feldmanCount}</span>
              <span className="ms-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">mentions</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
