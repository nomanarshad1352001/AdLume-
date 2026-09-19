import { daysAgoIso } from "../lib/youtube";

/* ---------------------------------- types ---------------------------------- */

export type MentionType =
  | "ad_read"
  | "organic"
  | "sponsored_segment"
  | "billboard"
  | "interview";

/** Review workflow state applied by a human analyst. */
export type MentionStatus = "verified" | "flagged";

export interface Advertiser {
  id: string;
  name: string;
  monogram: string;
  industry: string;
  color: string; // hex accent for monogram tiles
  aliases: string[];
  tagline: string;
  city: string;
}

export interface Show {
  id: string;
  name: string;
  hosts: string;
  cadence: string;
}

export interface VideoItem {
  id: string; // YouTube video id
  title: string;
  showId: string;
  publishedAt: string; // ISO
  durationSec: number;
  thumbnail: string;
  analyzedAt: string; // ISO
  generated?: boolean; // true when created from an arbitrary pasted URL
}

export interface TranscriptBeat {
  t: number;
  text: string;
}

export interface Mention {
  id: string;
  videoId: string;
  advertiserId: string;
  matchedText: string; // the exact alias / name that was spoken
  type: MentionType;
  confidence: number; // 0..1
  tStart: number; // seconds
  before: TranscriptBeat[];
  line: TranscriptBeat; // the sentence containing the mention
  after: TranscriptBeat[];
}

/* ------------------------------ mention types ------------------------------ */

export const TYPE_META: Record<
  MentionType,
  { label: string; short: string; color: string; soft: string }
> = {
  ad_read: { label: "Ad Read", short: "Ad", color: "#A8763E", soft: "#F4E9D4" },
  organic: { label: "Organic Mention", short: "Organic", color: "#52796F", soft: "#E4EDE7" },
  sponsored_segment: { label: "Sponsored Segment", short: "Segment", color: "#8E6C88", soft: "#EFE6EE" },
  billboard: { label: "Sponsor Billboard", short: "Billboard", color: "#5B7C99", soft: "#E3EAF1" },
  interview: { label: "Guest / Interview", short: "Guest", color: "#B5654A", soft: "#F6E5DE" },
};

export const TYPE_ORDER: MentionType[] = [
  "ad_read",
  "sponsored_segment",
  "organic",
  "billboard",
  "interview",
];

/* -------------------------------- advertisers ------------------------------ */

export const ADVERTISERS: Advertiser[] = [
  {
    id: "feldman",
    name: "Feldman Automotive",
    monogram: "FA",
    industry: "Automotive Retail",
    color: "#A8763E",
    aliases: ["Feldman Auto", "Feldman Chevrolet", "Feldman Chevy", "Feldman's", "the Feldman family"],
    tagline: "driven by trust since 1979",
    city: "Novi, MI",
  },
  {
    id: "marlowe",
    name: "Marlowe & Finch Jewelers",
    monogram: "MF",
    industry: "Fine Jewelry",
    color: "#8E6C88",
    aliases: ["Marlowe & Finch", "M&F Jewelers", "the Marlowe collection"],
    tagline: "heirlooms for the modern age",
    city: "Birmingham, MI",
  },
  {
    id: "bluebird",
    name: "Bluebird Mortgage Group",
    monogram: "BM",
    industry: "Home Financing",
    color: "#5B7C99",
    aliases: ["Bluebird Mortgage", "Bluebird Home Loans", "the Bluebird team"],
    tagline: "home, without the hurdles",
    city: "Royal Oak, MI",
  },
  {
    id: "copperline",
    name: "Copperline Coffee Roasters",
    monogram: "CC",
    industry: "Food & Beverage",
    color: "#B5654A",
    aliases: ["Copperline Coffee", "Copperline Roasters", "Copperline"],
    tagline: "small batch, bold city",
    city: "Detroit, MI",
  },
  {
    id: "greatlakes",
    name: "Great Lakes Dental Studio",
    monogram: "GL",
    industry: "Healthcare",
    color: "#52796F",
    aliases: ["Great Lakes Dental", "GL Dental Studio", "the Great Lakes smiles team"],
    tagline: "dentistry that doesn't feel like dentistry",
    city: "Troy, MI",
  },
  {
    id: "titanridge",
    name: "Titan Ridge Roofing",
    monogram: "TR",
    industry: "Home Services",
    color: "#6E5A44",
    aliases: ["Titan Ridge", "Titan Roofing & Exteriors", "the Titan crew"],
    tagline: "over your head, never over budget",
    city: "Warren, MI",
  },
  {
    id: "vantage",
    name: "Vantage Point Travel",
    monogram: "VP",
    industry: "Travel & Leisure",
    color: "#3E5F8A",
    aliases: ["Vantage Travel", "the Vantage Point team", "Vantage Point"],
    tagline: "plan less, wander more",
    city: "Ann Arbor, MI",
  },
  {
    id: "solstice",
    name: "Solstice Spa & Wellness",
    monogram: "SS",
    industry: "Wellness",
    color: "#9B8A5A",
    aliases: ["Solstice Spa", "Solstice Wellness", "the Solstice studio"],
    tagline: "come back to yourself",
    city: "Ferndale, MI",
  },
];

/* ---------------------------------- shows ---------------------------------- */

export const SHOWS: Show[] = [
  { id: "drive-home", name: "The Drive Home", hosts: "Marcus Hale & Dana Ruiz", cadence: "Weekdays · 4–7 PM" },
  { id: "motorcity", name: "MotorCity Mornings", hosts: "Priya Nair", cadence: "Weekdays · 6–10 AM" },
  { id: "torque", name: "Weekend Torque", hosts: "Eddie Salazar", cadence: "Saturdays · 9 AM" },
  { id: "nightshift", name: "Night Shift Radio", hosts: "Theo Ambrose", cadence: "Weeknights · 10 PM" },
  { id: "chrome", name: "Chrome & Coffee", hosts: "June Okafor", cadence: "Sundays · 8 AM" },
];

/* ---------------------------------- imagery -------------------------------- */
/* Pexels CDN — royalty-free stock photography */

export const IMG = {
  loginHero:
    "https://images.pexels.com/photos/17632052/pexels-photo-17632052.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1300&w=1000",
  loginCard:
    "https://images.pexels.com/photos/29566880/pexels-photo-29566880.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=400&w=640",
  avatar:
    "https://images.pexels.com/photos/6076115/pexels-photo-6076115.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=160&w=160",
  bannerChrome:
    "https://images.pexels.com/photos/32170359/pexels-photo-32170359.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=520&w=1000",
  vintageMic:
    "https://images.pexels.com/photos/39075530/pexels-photo-39075530.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=800&w=600",
  thumbHighway:
    "https://images.pexels.com/photos/28174482/pexels-photo-28174482.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=500&w=880",
  thumbMic:
    "https://images.pexels.com/photos/31213674/pexels-photo-31213674.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=500&w=880",
  thumbShowroom:
    "https://images.pexels.com/photos/29566880/pexels-photo-29566880.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=500&w=880",
  thumbGrille:
    "https://images.pexels.com/photos/16210131/pexels-photo-16210131.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=500&w=880",
  thumbTrails:
    "https://images.pexels.com/photos/28202181/pexels-photo-28202181.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=500&w=880",
  thumbPop:
    "https://images.pexels.com/photos/14195566/pexels-photo-14195566.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=500&w=880",
  thumbHandle:
    "https://images.pexels.com/photos/19736883/pexels-photo-19736883.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=500&w=880",
  thumbSuv:
    "https://images.pexels.com/photos/29566879/pexels-photo-29566879.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=500&w=880",
};

/* ------------------------------- seeded videos ------------------------------ */

export interface VideoSeedDef {
  id: string;
  title: string;
  showId: string;
  daysOld: number;
  durationSec: number;
  thumbnail: string;
}

export const VIDEO_SEEDS: VideoSeedDef[] = [
  { id: "aqz-KE-bpKQ", title: "Ep. 214 — The Great EV Price War", showId: "drive-home", daysOld: 2, durationSec: 3120, thumbnail: IMG.thumbHighway },
  { id: "eRsGyueVLvQ", title: "Ep. 158 — Cold Starts & Hot Takes", showId: "motorcity", daysOld: 6, durationSec: 2745, thumbnail: IMG.thumbMic },
  { id: "R6MlUcmOul8", title: "Ep. 88 — Convertible Season Buyer Guide", showId: "torque", daysOld: 11, durationSec: 3640, thumbnail: IMG.thumbShowroom },
  { id: "jfKfPfyJRdk", title: "Ep. 301 — Listener Garage Confessions", showId: "nightshift", daysOld: 17, durationSec: 2210, thumbnail: IMG.thumbTrails },
  { id: "UXqq0ZvbOnk", title: "Ep. 45 — Restomods, Rated & Roasted", showId: "chrome", daysOld: 26, durationSec: 4025, thumbnail: IMG.thumbGrille },
  { id: "Y-rmzh0PI3c", title: "Ep. 202 — The Lease-End Playbook", showId: "drive-home", daysOld: 37, durationSec: 1980, thumbnail: IMG.thumbPop },
  { id: "Z4C82eyhwgU", title: "Ep. 149 — Spring Buyers' Bonanza", showId: "motorcity", daysOld: 48, durationSec: 3380, thumbnail: IMG.thumbHandle },
];

export function seedVideo(def: VideoSeedDef): VideoItem {
  return {
    id: def.id,
    title: def.title,
    showId: def.showId,
    publishedAt: daysAgoIso(def.daysOld),
    durationSec: def.durationSec,
    thumbnail: def.thumbnail,
    analyzedAt: daysAgoIso(Math.max(0, def.daysOld - 1)),
  };
}

/* ------------------------------- lookup helpers ----------------------------- */

export const ADVERTISER_MAP: Record<string, Advertiser> = Object.fromEntries(
  ADVERTISERS.map((a) => [a.id, a]),
);
export const SHOW_MAP: Record<string, Show> = Object.fromEntries(
  SHOWS.map((s) => [s.id, s]),
);

export const DEMO_USER = {
  name: "Avery Sinclair",
  email: "avery@adlume.co",
  password: "demo1234",
  role: "Account Director",
  workspace: "Motown Media Group",
};
