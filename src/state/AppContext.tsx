import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ADVERTISERS,
  Advertiser,
  Mention,
  MentionStatus,
  VideoItem,
  VIDEO_SEEDS,
  seedVideo,
} from "../data/core";
import { generateMentions } from "../data/generator";

export interface User {
  name: string;
  email: string;
  role: string;
  workspace: string;
}

export interface Toast {
  id: number;
  title: string;
  body?: string;
}

export type ReportKind = "csv" | "json" | "html" | "zip" | "clipboard" | "edit";

export interface ReportEntry {
  id: string;
  kind: ReportKind;
  title: string;
  records: number;
  scope: string[];
  at: string; // ISO
}

interface AppContextValue {
  user: User | null;
  login: (email: string, name?: string) => void;
  logout: () => void;
  videos: VideoItem[];
  mentions: Mention[];
  videoMap: Record<string, VideoItem>;
  addAnalysis: (video: VideoItem, newMentions: Mention[]) => void;
  /** Advertisers merged with any user-added aliases (runtime config). */
  advertisers: Advertiser[];
  statuses: Record<string, MentionStatus | undefined>;
  setMentionStatus: (mentionId: string, status?: MentionStatus) => void;
  customAliases: Record<string, string[]>;
  addAlias: (advertiserId: string, alias: string) => void;
  removeAlias: (advertiserId: string, alias: string) => void;
  reportLog: ReportEntry[];
  logReport: (kind: ReportKind, title: string, records: number, scope: string[]) => void;
  clearReportLog: () => void;
  clearSelectionData: () => void;
  resetDemoData: () => void;
  toasts: Toast[];
  notify: (title: string, body?: string) => void;
  dismissToast: (id: number) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const USER_KEY = "adlume.demo.user";
const STATUS_KEY = "adlume.demo.statuses";
const ALIAS_KEY = "adlume.demo.aliases";
const REPORTS_KEY = "adlume.demo.reports";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

function buildSeedLibrary(): { videos: VideoItem[]; mentions: Mention[] } {
  const videos = VIDEO_SEEDS.map(seedVideo);
  const mentions = videos.flatMap((v) => generateMentions(v));
  return { videos, mentions };
}

const SEED_LIBRARY = buildSeedLibrary();

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readJson<User | null>(USER_KEY, null));
  const [videos, setVideos] = useState<VideoItem[]>(SEED_LIBRARY.videos);
  const [mentions, setMentions] = useState<Mention[]>(SEED_LIBRARY.mentions);
  const [statuses, setStatuses] = useState<Record<string, MentionStatus | undefined>>(() =>
    readJson(STATUS_KEY, {}),
  );
  const [customAliases, setCustomAliases] = useState<Record<string, string[]>>(() =>
    readJson(ALIAS_KEY, {}),
  );
  const [reportLog, setReportLog] = useState<ReportEntry[]>(() => readJson(REPORTS_KEY, []));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(1);

  useEffect(() => writeJson(STATUS_KEY, statuses), [statuses]);
  useEffect(() => writeJson(ALIAS_KEY, customAliases), [customAliases]);
  useEffect(() => writeJson(REPORTS_KEY, reportLog), [reportLog]);

  const login = useCallback((email: string, name?: string) => {
    const displayName =
      name ??
      email
        .split("@")[0]
        .replace(/[._-]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    const u: User = {
      name: displayName,
      email,
      role: "Account Director",
      workspace: "Motown Media Group",
    };
    setUser(u);
    writeJson(USER_KEY, u);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem(USER_KEY);
    } catch {
      /* noop */
    }
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (title: string, body?: string) => {
      const id = toastId.current++;
      setToasts((prev) => [...prev.slice(-3), { id, title, body }]);
      window.setTimeout(() => dismissToast(id), 3800);
    },
    [dismissToast],
  );

  const addAnalysis = useCallback((video: VideoItem, newMentions: Mention[]) => {
    setVideos((prev) => {
      const rest = prev.filter((v) => v.id !== video.id);
      return [{ ...video, analyzedAt: new Date().toISOString() }, ...rest];
    });
    setMentions((prev) => {
      const incoming = new Set(newMentions.map((m) => m.id));
      return [...prev.filter((m) => !incoming.has(m.id)), ...newMentions];
    });
  }, []);

  const setMentionStatus = useCallback((mentionId: string, status?: MentionStatus) => {
    setStatuses((prev) => {
      const next = { ...prev };
      if (status) next[mentionId] = status;
      else delete next[mentionId];
      return next;
    });
  }, []);

  const addAlias = useCallback((advertiserId: string, alias: string) => {
    const clean = alias.trim().replace(/[“”"]/g, "");
    if (!clean) return;
    setCustomAliases((prev) => {
      const base = ADVERTISERS.find((a) => a.id === advertiserId)?.aliases ?? [];
      const existing = (prev[advertiserId] ?? []).concat(base);
      if (existing.some((a) => a.toLowerCase() === clean.toLowerCase())) return prev;
      return { ...prev, [advertiserId]: [...(prev[advertiserId] ?? []), clean] };
    });
  }, []);

  const removeAlias = useCallback((advertiserId: string, alias: string) => {
    setCustomAliases((prev) => ({
      ...prev,
      [advertiserId]: (prev[advertiserId] ?? []).filter((a) => a !== alias),
    }));
  }, []);

  const logReport = useCallback(
    (kind: ReportKind, title: string, records: number, scope: string[]) => {
      setReportLog((prev) =>
        [
          {
            id: `r-${Date.now()}-${Math.round(Math.random() * 1e4)}`,
            kind,
            title,
            records,
            scope,
            at: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 40),
      );
    },
    [],
  );

  const clearReportLog = useCallback(() => setReportLog([]), []);

  const clearSelectionData = useCallback(() => {
    setStatuses({});
    setCustomAliases({});
  }, []);

  const resetDemoData = useCallback(() => {
    setStatuses({});
    setCustomAliases({});
    setReportLog([]);
    setVideos(SEED_LIBRARY.videos);
    setMentions(SEED_LIBRARY.mentions);
    try {
      localStorage.removeItem(STATUS_KEY);
      localStorage.removeItem(ALIAS_KEY);
      localStorage.removeItem(REPORTS_KEY);
    } catch {
      /* noop */
    }
  }, []);

  const advertisers = useMemo<Advertiser[]>(
    () =>
      ADVERTISERS.map((a) => ({
        ...a,
        aliases: [...a.aliases, ...(customAliases[a.id] ?? [])],
      })),
    [customAliases],
  );

  const videoMap = useMemo(
    () => Object.fromEntries(videos.map((v) => [v.id, v])),
    [videos],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      user,
      login,
      logout,
      videos,
      mentions,
      videoMap,
      addAnalysis,
      advertisers,
      statuses,
      setMentionStatus,
      customAliases,
      addAlias,
      removeAlias,
      reportLog,
      logReport,
      clearReportLog,
      clearSelectionData,
      resetDemoData,
      toasts,
      notify,
      dismissToast,
    }),
    [
      user,
      login,
      logout,
      videos,
      mentions,
      videoMap,
      addAnalysis,
      advertisers,
      statuses,
      setMentionStatus,
      customAliases,
      addAlias,
      removeAlias,
      reportLog,
      logReport,
      clearReportLog,
      clearSelectionData,
      resetDemoData,
      toasts,
      notify,
      dismissToast,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
