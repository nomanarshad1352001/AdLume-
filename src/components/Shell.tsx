import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  CheckCircle2,
  Film,
  LayoutDashboard,
  LogOut,
  Menu,
  Quote,
  ScanSearch,
  Scissors,
  ScrollText,
  Sparkles,
  X,
} from "lucide-react";
import { useApp } from "../state/AppContext";
import { Avatar, Logo, LogoMark, USER_AVATAR } from "./brand";
import { cn } from "../utils/cn";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/analyze", label: "Analyze Video", icon: ScanSearch },
  { to: "/mentions", label: "Mentions", icon: Quote, badge: true },
  { to: "/clips", label: "Clip Studio", icon: Scissors },
  { to: "/reports", label: "Reports", icon: ScrollText },
  { to: "/advertisers", label: "Advertisers", icon: Building2 },
  { to: "/library", label: "Library", icon: Film },
];

const PAGE_META: Record<string, { title: string; sub: string }> = {
  "/": { title: "Overview", sub: "Your channel's mention intelligence at a glance" },
  "/analyze": { title: "Analyze Video", sub: "Paste a YouTube link, get every advertiser mention" },
  "/mentions": { title: "Mention Explorer", sub: "Every spotted mention with transcript context" },
  "/clips": { title: "Clip Studio", sub: "Auto-trim every mention into exportable video clips" },
  "/reports": { title: "Reports", sub: "Preset reports and your complete export audit trail" },
  "/advertisers": { title: "Advertisers", sub: "Tracked brands, aliases and coverage" },
  "/library": { title: "Video Library", sub: "Every episode the engine has combed through" },
};

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const { mentions } = useApp();
  return (
    <nav className="space-y-1">
      {NAV.map(({ to, label, icon: Icon, end, badge }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-semibold transition-all duration-200",
              isActive
                ? "bg-ink text-cream shadow-soft"
                : "text-ink-soft hover:bg-champagne-soft hover:text-ink",
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={17} strokeWidth={2} className={isActive ? "text-gold-tint" : "text-ink-faint transition group-hover:text-gold-deep"} />
              <span className="flex-1">{label}</span>
              {badge && (
                <span
                  className={cn(
                    "mono rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    isActive ? "bg-gold/25 text-gold-tint" : "bg-champagne text-gold-deep",
                  )}
                >
                  {mentions.length}
                </span>
              )}
              {isActive && <span className="h-4 w-[3px] rounded-full bg-gradient-to-b from-gold-tint to-gold" />}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarFooter() {
  const { user, logout, resetDemoData, notify } = useApp();
  const navigate = useNavigate();
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-gold-tint/60 bg-gradient-to-br from-champagne-soft to-champagne p-3.5">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-deep">
          <Sparkles size={13} />
          Demo Suite
        </div>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-soft">
          Full intelligence preview — no data leaves your browser.
        </p>
        <button
          onClick={() => {
            resetDemoData();
            notify("Demo workspace reset", "Statuses, aliases, exports & analyses restored.");
          }}
          className="mt-2 text-[10.5px] font-semibold text-gold-deep underline decoration-gold-tint underline-offset-4 transition hover:decoration-gold-deep"
        >
          Reset demo data
        </button>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-line bg-paper p-2.5">
        <Avatar name={user?.name ?? "Guest"} src={USER_AVATAR} size={36} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-ink">{user?.name}</div>
          <div className="truncate text-[11px] text-ink-faint">{user?.role}</div>
        </div>
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="rounded-lg p-2 text-ink-faint transition hover:bg-champagne-soft hover:text-gold-deep"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut size={15} />
        </button>
      </div>
    </div>
  );
}

function Toasts() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[min(92vw,340px)] flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-ink px-4 py-3 shadow-lift"
          >
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-gold-tint" />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-cream">{t.title}</div>
              {t.body && <div className="mono mt-0.5 truncate text-[11px] text-cream/55">{t.body}</div>}
            </div>
            <button onClick={() => dismissToast(t.id)} className="text-cream/40 transition hover:text-cream" aria-label="Dismiss">
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default function Shell() {
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();
  const meta = PAGE_META[location.pathname] ?? PAGE_META["/"];

  useEffect(() => {
    setDrawer(false);
  }, [location.pathname]);

  useEffect(() => {
    document.querySelector("#main-scroll")?.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ------------------------------- desktop sidebar ------------------------------ */}
      <aside className="hidden w-[264px] shrink-0 flex-col justify-between border-e border-line bg-cream/70 px-4 py-6 backdrop-blur lg:flex">
        <div>
          <div className="px-2 pb-6">
            <Logo />
          </div>
          <div className="gold-rule mb-5" />
          <NavItems />
        </div>
        <SidebarFooter />
      </aside>

      {/* ------------------------------- mobile drawer ------------------------------- */}
      <AnimatePresence>
        {drawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawer(false)}
              className="fixed inset-0 z-[70] bg-ink/30 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 left-0 z-[80] flex w-[280px] flex-col justify-between bg-cream px-4 py-6 shadow-lift lg:hidden"
            >
              <div>
                <div className="flex items-center justify-between px-2 pb-6">
                  <Logo />
                  <button onClick={() => setDrawer(false)} className="rounded-lg p-2 text-ink-faint hover:bg-champagne-soft" aria-label="Close menu">
                    <X size={18} />
                  </button>
                </div>
                <NavItems onNavigate={() => setDrawer(false)} />
              </div>
              <SidebarFooter />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ---------------------------------- main pane --------------------------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="z-40 flex items-center gap-3 border-b border-line bg-porcelain/85 px-4 py-3.5 backdrop-blur-md sm:px-7">
          <button
            onClick={() => setDrawer(true)}
            className="rounded-lg border border-line bg-paper p-2 text-ink-soft lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={17} />
          </button>
          <div className="lg:hidden">
            <LogoMark size={30} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="serif-tight truncate text-[19px] font-semibold leading-tight text-ink">{meta.title}</h1>
            <p className="hidden truncate text-[12px] text-ink-faint sm:block">{meta.sub}</p>
          </div>
          <NavLink to="/analyze" className="btn-gold !px-4 !py-2.5 text-[13px]">
            <ScanSearch size={15} />
            <span className="hidden sm:inline">New analysis</span>
            <span className="sm:hidden">Analyze</span>
          </NavLink>
        </header>

        <main id="main-scroll" className="min-h-0 flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto w-full max-w-[1180px] px-4 py-7 sm:px-7 sm:py-9"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <Toasts />
    </div>
  );
}
