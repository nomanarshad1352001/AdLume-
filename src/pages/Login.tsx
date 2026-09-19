import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ADVERTISERS, DEMO_USER, IMG, TYPE_META } from "../data/core";
import { useApp } from "../state/AppContext";
import { LogoMark } from "../components/brand";
import { cn } from "../utils/cn";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 * i, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

function TypewriterFieldPreview() {
  return (
    <div className="animate-floaty w-[min(86%,320px)] rounded-2xl border border-white/25 bg-white/12 p-4 shadow-lift backdrop-blur-xl" style={{ ["--fl-rot" as never]: "-1.5deg" }}>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink/70 text-[13px] font-semibold text-gold-tint" style={{ fontFamily: "var(--font-display)" }}>
          FA
        </span>
        <div className="flex-1">
          <div className="text-[13px] font-semibold text-white">Feldman Automotive</div>
          <div className="text-[10.5px] text-white/60">spoken as “Feldman Chevy”</div>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em]"
          style={{ backgroundColor: TYPE_META.ad_read.soft, color: TYPE_META.ad_read.color }}
        >
          Ad Read
        </span>
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-white/85">
        “…this portion of the show is brought to you by{" "}
        <span className="hl font-semibold">Feldman Chevrolet</span> — driven by trust since 1979…”
      </p>
      <div className="mt-3 flex items-center justify-between">
        <span className="mono text-[11px] font-medium text-gold-tint">14:32 / 52:00</span>
        <span className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold text-ink">
          <Play size={10} className="fill-current" /> Watch moment
        </span>
      </div>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { login } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [typed, setTyped] = useState(false);
  const [busy, setBusy] = useState(false);
  const cancel = useRef(false);

  useEffect(() => {
    cancel.current = false;
    return () => {
      cancel.current = true;
    };
  }, []);

  const autofill = async () => {
    if (busy) return;
    cancel.current = false;
    setTyped(false);
    setEmail("");
    setPassword("");
    for (let i = 1; i <= DEMO_USER.email.length; i++) {
      if (cancel.current) return;
      setEmail(DEMO_USER.email.slice(0, i));
      await wait(26);
    }
    await wait(140);
    for (let i = 1; i <= DEMO_USER.password.length; i++) {
      if (cancel.current) return;
      setPassword(DEMO_USER.password.slice(0, i));
      await wait(34);
    }
    setTyped(true);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const finalEmail = email.trim() || DEMO_USER.email;
    window.setTimeout(() => {
      login(finalEmail, finalEmail === DEMO_USER.email ? DEMO_USER.name : undefined);
      navigate("/");
    }, 750);
  };

  return (
    <div className="grid min-h-screen bg-porcelain lg:grid-cols-[1.05fr_1fr]">
      {/* ------------------------------ left: visual panel ----------------------------- */}
      <div className="relative hidden overflow-hidden lg:block">
        <img
          src={IMG.loginHero}
          alt="Luxury automobile showroom"
          className="absolute inset-0 h-full w-full scale-105 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/45 via-ink/10 to-ink/75" />
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-gold-tint/60 to-transparent" />

        {/* brand */}
        <div className="absolute left-10 top-10 flex items-center gap-3">
          <LogoMark size={40} />
          <div className="leading-none">
            <div className="serif-tight text-[22px] font-semibold text-white">
              Ad<span className="italic font-medium">Lume</span>
            </div>
            <div className="mt-1 text-[8.5px] font-semibold uppercase tracking-[0.3em] text-white/60">
              Mention Intelligence
            </div>
          </div>
        </div>

        {/* floating product preview */}
        <div className="absolute inset-x-0 top-[16%] flex justify-center">
          <TypewriterFieldPreview />
        </div>

        {/* confidence chip */}
        <div
          className="animate-floaty-late absolute right-[11%] top-[13%] rounded-full border border-white/25 bg-white/12 px-3.5 py-2 backdrop-blur-xl"
          style={{ ["--fl-rot" as never]: "2deg" }}
        >
          <span className="mono text-[11px] font-semibold text-white">
            <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse-dot rounded-full bg-gold-tint align-middle" />
            97% match confidence
          </span>
        </div>

        {/* bottom copy + marquee */}
        <div className="absolute inset-x-10 bottom-9">
          <p className="serif-tight max-w-md text-[30px] font-medium leading-[1.15] text-white">
            Every mention.
            <br />
            <span className="italic text-gold-tint">Every timestamp.</span>
          </p>
          <div className="my-5 h-px bg-gradient-to-r from-gold-tint/70 via-white/20 to-transparent" />
          <div className="relative overflow-hidden" style={{ maskImage: "linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)" }}>
            <div className="flex w-max animate-marquee gap-8">
              {[...ADVERTISERS, ...ADVERTISERS].map((a, i) => (
                <span key={i} className="flex items-center gap-3 whitespace-nowrap text-[11.5px] font-semibold uppercase tracking-[0.2em] text-white/55">
                  {a.name}
                  <span className="h-1 w-1 rotate-45 bg-gold-tint/70" />
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------- right: the form ------------------------------ */}
      <div className="relative flex flex-col justify-center px-6 py-12 sm:px-14 xl:px-24">
        {/* mobile brand banner */}
        <div className="relative mb-10 -mx-6 -mt-12 h-44 overflow-hidden lg:hidden">
          <img src={IMG.loginHero} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/30 to-ink/70" />
          <div className="absolute bottom-4 left-6 flex items-center gap-2.5">
            <LogoMark size={34} />
            <span className="serif-tight text-lg font-semibold text-white">
              Ad<span className="italic">Lume</span>
            </span>
          </div>
        </div>

        <motion.div
          initial="hidden"
          animate="show"
          className="mx-auto w-full max-w-[400px]"
        >
          <motion.div variants={fadeUp} custom={0} className="eyebrow mb-4 flex items-center gap-2">
            <span className="h-px w-6 bg-gold-tint" />
            Welcome back
          </motion.div>

          <motion.h1 variants={fadeUp} custom={1} className="serif-tight text-[clamp(30px,4vw,38px)] font-semibold leading-[1.08] text-ink">
            Step inside your
            <br />
            <span className="italic font-medium text-gold-deep">mention intelligence</span> suite.
          </motion.h1>

          <motion.p variants={fadeUp} custom={2} className="mt-4 text-[14.5px] leading-relaxed text-ink-soft">
            Paste a YouTube link, and AdLume surfaces every advertiser name — first-party or alias —
            with the exact second it aired.
          </motion.p>

          <motion.form variants={fadeUp} custom={3} onSubmit={submit} className="mt-8 space-y-4">
            <div className="relative">
              <Mail size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setTyped(false); }}
                placeholder="Work email"
                aria-label="Email"
                autoComplete="email"
                className="input !pl-11"
              />
            </div>
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setTyped(false); }}
                placeholder="Password"
                aria-label="Password"
                autoComplete="current-password"
                className="input !pl-11 !pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-faint transition hover:text-ink"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={autofill}
                className={cn(
                  "group inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[12px] font-semibold transition-all duration-300",
                  typed
                    ? "border-sage/40 bg-sage-soft text-sage"
                    : "border-gold-tint bg-champagne-soft text-gold-deep hover:border-gold-bright hover:shadow-gold",
                )}
              >
                {typed ? <Check size={14} /> : <Sparkles size={14} className="transition-transform duration-300 group-hover:rotate-12" />}
                {typed ? "Demo credentials loaded" : "Autofill demo credentials"}
              </button>
              <span className="text-[12px] font-medium text-ink-faint">Forgot password?</span>
            </div>

            <button type="submit" className="btn-gold w-full !py-3.5 text-[14.5px]" disabled={busy}>
              {busy ? (
                <>
                  <span className="h-4 w-4 animate-spin-slow rounded-full border-2 border-white/40 border-t-white" />
                  Unlocking your suite…
                </>
              ) : (
                <>
                  Sign in to AdLume
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </motion.form>

          <motion.div variants={fadeUp} custom={4} className="mt-9">
            <div className="gold-rule" />
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                { v: "2,400+", l: "Mentions indexed" },
                { v: "8", l: "Advertisers tracked" },
                { v: "±1s", l: "Timestamp precision" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="mono text-[17px] font-semibold text-ink">{s.v}</div>
                  <div className="mt-0.5 text-[10.5px] font-medium uppercase tracking-[0.1em] text-ink-faint">{s.l}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.p variants={fadeUp} custom={5} className="mt-9 flex items-center gap-2 text-[11.5px] leading-relaxed text-ink-faint">
            <ShieldCheck size={14} className="shrink-0 text-sage" />
            Demo workspace — sample data only. Nothing you enter leaves this browser.
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
