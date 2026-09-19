import {
  ADVERTISERS,
  Advertiser,
  Mention,
  MentionType,
  SHOWS,
  VideoItem,
  VIDEO_SEEDS,
  seedVideo,
} from "./core";
import { hashSeed, mulberry32, pick, int, weighted, chance, shuffled } from "../lib/rng";
import { ytThumb } from "../lib/youtube";

/* --------------------------- transcript template bank ---------------------- */

const SEGMENTS = [
  "Trade-In Tracker",
  "Road Report",
  "Deal Desk",
  "Under the Hood",
  "Friday Fuel-Up",
  "Lot Walk",
];

const PRE_LINES = [
  "Alright, welcome back to the show — hour two, thanks for riding with us.",
  "Before we get to the phones, let's take care of a little business.",
  "You're listening on the app, on the stream, and on the air — appreciate you.",
  "If you missed the first hour, the podcast version drops tonight.",
  "Let's reset the room for everybody just joining us.",
  "Quick heads-up — the text line is absolutely on fire today.",
  "We'll get to your calls in a minute, I promise.",
  "Welcome back — Dana just flagged something in the chat.",
  "Traffic is a mess out on the Lodge, we'll get to that in ninety seconds.",
  "New here? This is the part of the show where we keep the lights on.",
];

const POST_LINES = [
  "Alright, the phone lines are open — 555-0199, who's up first.",
  "Coming up after the break: your calls, and Marcus has a confession.",
  "We'll put the link in the show notes, as always.",
  "Keep it locked right here — back in ninety seconds.",
  "Dana, what's the first topic on the board?",
  "Okay — when we come back, the segment everybody texts about.",
  "That's the business. Let's get into it.",
  "Stick around — hour three is when it gets weird.",
];

const TEMPLATES: Record<MentionType, string[]> = {
  ad_read: [
    "This portion of the show is brought to you by {A} — {T}. Tell them the show sent you.",
    "Quick word about our friends at {A}: {T}, and after all these years, they still mean it.",
    "Today's episode is proudly sponsored by {A}. Mention the show and they'll take care of you like family.",
    "Big thanks to {A} for keeping us on the air — {T}, and that is not just a line.",
    "Let me tell you about {A} for a second — {T}. Stop by the showroom this weekend.",
  ],
  organic: [
    "Honestly, I drove past {A} on the way in this morning — the lot was packed at nine a.m.",
    "Dana actually picked hers up at {A} last spring and she still will not stop talking about it.",
    "Full disclosure, my cousin sells cars at {A}, so take all of this with a grain of salt.",
    "Off air we were talking about service departments — say what you want, {A} sets the bar around here.",
    "A listener texted in asking where we send our own families — nine times out of ten it's {A}.",
  ],
  sponsored_segment: [
    "Alright, time for the {S}, presented by {A} — {T}.",
    "This week's {S} is powered by {A}. Let's see what's moving on the lot.",
    "It is {S} o'clock, and that means our partners at {A} are on the board.",
  ],
  billboard: [
    "{A} — {T}. More on that after the break.",
    "Brought to you in part by {A}. We'll be right back.",
    "Support for today's show comes from {A}.",
  ],
  interview: [
    "Joining us live from {A}, it's their general manager — welcome back to the program.",
    "We actually called up the team at {A} this week to get their side of the story.",
    "Our next guest runs the service department over at {A} — thanks for coming on.",
  ],
};

const FILLER_TOPICS = [
  "The Art of the Test Drive",
  "Winter Tires, Summer Regrets",
  "Detailing on a Dime",
  "When to Walk Away From a Deal",
  "Certified Pre-Owned, Decoded",
  "The Trade-In Trap",
  "Roadside Kits That Actually Work",
  "Hybrid Myths, Busted",
  "Degree Days & Display Days",
  "Auction Secrets They Never Tell You",
];

/* ------------------------------- core generator ----------------------------- */

const rep = (s: string, search: string, value: string) => s.split(search).join(value);

function fillTemplate(tpl: string, adv: Advertiser, rng: () => number) {
  const alias = chance(rng, 0.42) ? adv.name : pick(rng, adv.aliases);
  const text = rep(
    rep(rep(tpl, "{A}", alias), "{T}", adv.tagline),
    "{S}",
    pick(rng, SEGMENTS),
  );
  return { text, matched: alias };
}

const TYPE_WEIGHTS: readonly (readonly [MentionType, number])[] = [
  ["ad_read", 40],
  ["organic", 24],
  ["sponsored_segment", 17],
  ["billboard", 11],
  ["interview", 8],
];

/**
 * Produce a stable, realistic set of timestamped mentions for a video.
 * Same (video, advertisers) → same output, forever.
 */
export function generateMentions(
  video: VideoItem,
  advertiserIds?: string[],
  advertisers: Advertiser[] = ADVERTISERS,
): Mention[] {
  const vrng = mulberry32(hashSeed("video:" + video.id));

  let ids = advertiserIds;
  if (!ids) {
    // pick 2–4 advertisers per video; Feldman appears in most videos
    const count = int(vrng, 2, 4);
    const rest = shuffled(vrng, advertisers.slice(1).map((a) => a.id));
    const chosen = chance(vrng, 0.86) ? ["feldman"] : [rest.pop()!];
    while (chosen.length < count && rest.length) chosen.push(rest.pop()!);
    ids = shuffled(vrng, chosen);
  }

  // Build raw mention drafts (no timestamps yet)
  interface Draft {
    advertiserId: string;
    matchedText: string;
    type: MentionType;
    confidence: number;
    lineText: string;
  }
  const drafts: Draft[] = [];

  ids.forEach((advId) => {
    const adv = ADVERTISERS.find((a) => a.id === advId);
    if (!adv) return;
    const rng = mulberry32(hashSeed(`mention:${video.id}:${advId}`));
    const n = advId === "feldman" ? int(rng, 2, 3) : int(rng, 1, 2);
    for (let k = 0; k < n; k++) {
      const type = weighted(rng, TYPE_WEIGHTS);
      const { text, matched } = fillTemplate(pick(rng, TEMPLATES[type]), adv, rng);
      const confidence = Math.round((0.86 + rng() * 0.13) * 100) / 100;
      drafts.push({ advertiserId: advId, matchedText: matched, type, confidence, lineText: text });
    }
  });

  // Spread drafts across the runtime with breathing room.
  const margin = Math.min(150, video.durationSec * 0.08);
  const span = video.durationSec - margin * 2;
  const slots = drafts.length;
  const trng = mulberry32(hashSeed("time:" + video.id));

  const placed = drafts.map((d, i) => {
    const base = margin + (span * (i + 0.5)) / slots;
    const jitter = (trng() - 0.5) * (span / slots) * 0.7;
    return { ...d, t: Math.max(20, Math.min(video.durationSec - 30, Math.round(base + jitter))) };
  });
  placed.sort((a, b) => a.t - b.t);

  return placed.map((d, i) => {
    const rng = mulberry32(hashSeed(`ctx:${video.id}:${i}:${d.t}`));
    const gap1 = int(rng, 9, 26);
    const gap2 = gap1 + int(rng, 10, 28);
    const post1 = int(rng, 8, 22);
    const post2 = post1 + int(rng, 12, 30);
    const pre = shuffled(rng, PRE_LINES);
    const post = shuffled(rng, POST_LINES);
    return {
      id: `m-${video.id}-${d.advertiserId}-${i}`,
      videoId: video.id,
      advertiserId: d.advertiserId,
      matchedText: d.matchedText,
      type: d.type,
      confidence: d.confidence,
      tStart: d.t,
      before: [
        { t: Math.max(0, d.t - gap2), text: pre[0] },
        { t: Math.max(0, d.t - gap1), text: pre[1] },
      ],
      line: { t: d.t, text: d.lineText },
      after: [
        { t: Math.min(video.durationSec, d.t + post1), text: post[0] },
        { t: Math.min(video.durationSec, d.t + post2), text: post[1] },
      ],
    } satisfies Mention;
  });
}

/* ------------------------- synthesize a video from URL ---------------------- */

export function videoFromYouTubeId(id: string): VideoItem {
  const existing = VIDEO_SEEDS.find((v) => v.id === id);
  if (existing) return seedVideo(existing);

  const rng = mulberry32(hashSeed("gen:" + id));
  const show = pick(rng, SHOWS);
  const topic = pick(rng, FILLER_TOPICS);
  return {
    id,
    title: `Ep. ${int(rng, 40, 340)} — ${topic}`,
    showId: show.id,
    publishedAt: new Date().toISOString(),
    durationSec: int(rng, 1500, 4200),
    thumbnail: ytThumb(id),
    analyzedAt: new Date().toISOString(),
    generated: true,
  };
}

/** Flatten a mention's transcript window for display. */
export function mentionBeats(m: Mention) {
  return [
    ...m.before.map((b) => ({ ...b, hit: false })),
    { ...m.line, hit: true },
    ...m.after.map((b) => ({ ...b, hit: false })),
  ];
}

/** Highlight helper — split a string on the matched term (case-insensitive). */
export function splitOnTerm(text: string, term: string): string[] {
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return [text];
  return [text.slice(0, idx), text.slice(idx, idx + term.length), text.slice(idx + term.length)];
}
