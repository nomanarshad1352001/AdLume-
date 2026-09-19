import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, ExternalLink, Film, Play, Search } from "lucide-react";
import { ADVERTISER_MAP, SHOW_MAP } from "../data/core";
import { fmtDate, fmtTime, watchUrl } from "../lib/youtube";
import { useApp } from "../state/AppContext";
import { FancySelect, Monogram } from "../components/ui";
import { cn } from "../utils/cn";

export default function Library() {
  const { videos, mentions } = useApp();
  const navigate = useNavigate();
  const [showId, setShowId] = useState("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const map = new Map<string, { n: number; advs: Set<string> }>();
    mentions.forEach((m) => {
      const cur = map.get(m.videoId) ?? { n: 0, advs: new Set<string>() };
      cur.n++;
      cur.advs.add(m.advertiserId);
      map.set(m.videoId, cur);
    });
    return map;
  }, [mentions]);

  const totalRuntime = videos.reduce((s, v) => s + v.durationSec, 0);

  const q = query.trim().toLowerCase();
  const list = [...videos]
    .filter((v) => (showId === "all" || v.showId === showId) && (!q || v.title.toLowerCase().includes(q)))
    .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));

  return (
    <div className="space-y-6">
      {/* header strip */}
      <div className="card flex flex-wrap items-center gap-x-8 gap-y-3 px-6 py-5">
        {[
          { v: String(videos.length), l: "episodes analyzed" },
          { v: fmtTime(totalRuntime), l: "runtime combed" },
          { v: String(mentions.length), l: "mentions on record" },
        ].map((s) => (
          <div key={s.l}>
            <div className="mono text-[22px] font-semibold text-ink">{s.v}</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">{s.l}</div>
          </div>
        ))}
        <div className="ms-auto flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search episodes…"
              className="input !w-[190px] !py-2 !pl-10 !text-[12.5px]"
              aria-label="Search episodes"
            />
          </div>
          <FancySelect
            value={showId}
            onChange={setShowId}
            icon={Film}
            ariaLabel="Filter by show"
            className="w-[180px]"
            options={[
              { value: "all", label: "All shows" },
              ...Object.values(SHOW_MAP).map((s) => ({ value: s.id, label: s.name })),
            ]}
          />
        </div>
      </div>

      {/* video grid */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((v, i) => {
          const c = counts.get(v.id);
          const advs = [...(c?.advs ?? [])].slice(0, 4);
          return (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.45 }}
              className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-lift"
            >
              <button onClick={() => navigate(`/mentions?video=${v.id}`)} className="relative block aspect-[16/9] overflow-hidden text-left">
                <img
                  src={v.thumbnail}
                  alt={v.title}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.pexels.com/photos/28174482/pexels-photo-28174482.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=500&w=880";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
                <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink opacity-0 shadow-lift transition duration-300 group-hover:opacity-100">
                  <Play size={18} className="ms-0.5 fill-current" />
                </span>
                <span className="mono absolute bottom-2.5 right-2.5 rounded-md bg-ink/85 px-2 py-0.5 text-[11px] font-semibold text-cream">
                  {fmtTime(v.durationSec)}
                </span>
                {c && (
                  <span className="absolute left-2.5 top-2.5 rounded-full bg-champagne/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-gold-deep">
                    {c.n} mentions
                  </span>
                )}
                {v.generated && (
                  <span className="absolute right-2.5 top-2.5 rounded-full bg-paper/90 px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">
                    just analyzed
                  </span>
                )}
              </button>
              <div className="flex flex-1 flex-col p-5">
                <div className="mb-2 flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.14em]">
                  <span className="text-gold-deep">{SHOW_MAP[v.showId]?.name}</span>
                  <span className="h-0.5 w-0.5 rounded-full bg-ink-faint" />
                  <span className="font-medium normal-case tracking-normal text-ink-faint">{fmtDate(v.publishedAt)}</span>
                </div>
                <h3 className="serif-tight text-[17px] font-semibold leading-snug text-ink">{v.title}</h3>
                <p className="mono mt-1.5 text-[11px] text-ink-faint">youtu.be/{v.id}</p>

                <div className="mt-auto flex items-center justify-between pt-4">
                  <div className="flex -space-x-1.5">
                    {advs.map((id) => {
                      const adv = ADVERTISER_MAP[id];
                      return adv ? <Monogram key={id} advertiser={adv} size={26} className="ring-2 ring-paper" /> : null;
                    })}
                    {c && c.advs.size > 4 && (
                      <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-line-soft text-[9.5px] font-bold text-ink-soft ring-2 ring-paper">
                        +{c.advs.size - 4}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <a
                      href={watchUrl(v.id)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-lg p-2 text-ink-faint transition hover:bg-champagne-soft hover:text-gold-deep"
                      aria-label="Open on YouTube"
                      title="Open on YouTube"
                    >
                      <ExternalLink size={14} />
                    </a>
                    <button
                      onClick={() => navigate(`/mentions?video=${v.id}`)}
                      className={cn("btn-ghost !px-3 !py-1.5 text-[11.5px]")}
                    >
                      Mentions <ArrowUpRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
