export const ADD_TICKER = "ADD";
export const ADD_CONTRACT = "4DDco1nEng1neW9kQmPvLbNzRtYwEoUiAhJk7sFxPpump";
export const TREASURY_WALLET = "WaRcH3sT7ADDtreaSuRy9kQmPvLbNzRtYwEoUiAhJkXz";

const ADJECTIVES = [
  "Turbo", "Based", "Giga", "Quantum", "Cyber", "Mega", "Hyper", "Cosmic",
  "Atomic", "Diamond", "Golden", "Rocket", "Lunar", "Solar", "Pixel", "Retro",
  "Neon", "Vapor", "Degen", "Chad", "Alpha", "Sigma", "Stealth", "Phantom",
  "Galaxy", "Inferno", "Frost", "Thunder", "Velvet", "Electric", "Infinite",
];

const NOUNS = [
  "Doge", "Pepe", "Cat", "Inu", "Shiba", "Frog", "Moon", "Pump", "Ape",
  "Bull", "Bonk", "Wojak", "Floki", "Banana", "Lambo", "Whale", "Snek",
  "Goblin", "Wizard", "Samurai", "Ninja", "Dragon", "Tiger", "Panda",
  "Llama", "Penguin", "Hippo", "Mantis", "Phoenix", "Yeti",
];

const BOOST_PACKS = [100, 250, 500, 1000];
const AD_SLOTS = [
  "Solana Trending #1",
  "DEX homepage banner",
  "Photon spotlight",
  "Birdeye featured",
  "DexTools hot pairs",
];

export type PopupKind = "singles" | "prize" | "alert" | "money" | "ram" | "pump";

export type PopupVariant = {
  kind: PopupKind;
  title: string;
  kicker: string;
  headlines: string[];
  sub: string;
  cta: string;
  glyph: string;
};

export const POPUP_VARIANTS: PopupVariant[] = [
  {
    kind: "singles",
    title: "ADDCOIN :: 1 New Match",
    kicker: "* NEW MATCH NEARBY *",
    headlines: [
      "HOT $ADDCOIN in your area!",
      "3 lonely degens near you just aped $ADDCOIN",
      "someone 0.4km away likes your wallet ;)",
    ],
    sub: "they want to see your bags. buy $ADDCOIN to chat now.",
    cta: "View Matches",
    glyph: "<3",
  },
  {
    kind: "prize",
    title: "ADDCOIN :: YOU WON!!!",
    kicker: "* CONGRATULATIONS *",
    headlines: [
      "you are visitor 1,000,000!",
      "you WON a free bag of $ADDCOIN!",
      "claim your $ADDCOIN airdrop NOW!",
    ],
    sub: "prize expires in 00:09 -- claim before the timer hits zero.",
    cta: "Claim Prize",
    glyph: "★",
  },
  {
    kind: "alert",
    title: "System Alert",
    kicker: "* SECURITY WARNING *",
    headlines: [
      "WARNING: 0 $ADDCOIN detected",
      "your wallet is dangerously LOW on gains",
      "5 missed pumps found on this PC",
    ],
    sub: "your portfolio is at critical risk. install $ADDCOIN immediately.",
    cta: "Fix Now",
    glyph: "!",
  },
  {
    kind: "money",
    title: "ADDCOIN :: $$$",
    kicker: "* WORK FROM HOME *",
    headlines: [
      "make $$$ FAST from home!",
      "turn 0.1 SOL into a LAMBO!",
      "she quit her job after buying $ADDCOIN",
    ],
    sub: "step 1: buy $ADDCOIN. step 2: ??? step 3: PROFIT.",
    cta: "Start Earning",
    glyph: "$",
  },
  {
    kind: "ram",
    title: "ADDCOIN :: Optimizer",
    kicker: "* SYSTEM SLOW *",
    headlines: [
      "your PC is SLOW (it holds 0 $ADDCOIN)",
      "download more gains -- 100% free!",
      "1 driver out of date: ADDCOIN.exe",
    ],
    sub: "click below to install $ADDCOIN and speed up your bags.",
    cta: "Download Gains",
    glyph: "▼",
  },
  {
    kind: "pump",
    title: "ADDCOIN :: LIVE",
    kicker: "* PUMPING NOW *",
    headlines: [
      "$ADDCOIN is PUMPING +900%",
      "whales are loading $ADDCOIN right now",
      "last chance before $ADDCOIN 100x's",
    ],
    sub: "the war chest just bought another boost. do not fade this.",
    cta: "Buy $ADD Now",
    glyph: "▲",
  },
];

export type PopupPick = {
  kind: PopupKind;
  title: string;
  kicker: string;
  headline: string;
  sub: string;
  cta: string;
  glyph: string;
};

export function makePopupContent(): PopupPick {
  const v = pick(POPUP_VARIANTS);
  return {
    kind: v.kind,
    title: v.title,
    kicker: v.kicker,
    headline: pick(v.headlines),
    sub: v.sub,
    cta: v.cta,
    glyph: v.glyph,
  };
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type AddStats = {
  price: number;
  marketCap: number;
  change24h: number;
};

export function initialAddStats(): AddStats {
  return { price: 0.00042, marketCap: 184000, change24h: 47 };
}

export type EventKind = "launch" | "boost" | "ad";

export type FeedEvent = {
  id: string;
  kind: EventKind;
  at: number;
  title: string;
  sub: string;
  amount: number;
  treasury: number;
};

let counter = 0;
function nid(at: number): string {
  counter += 1;
  return `${at}-${counter}-${Math.random().toString(36).slice(2, 6)}`;
}

export function makeLaunch(at: number, treasuryBefore: number): FeedEvent {
  const name = `${pick(ADJECTIVES)} ${pick(NOUNS)}`;
  const fee = randInt(40, 110) / 100;
  return {
    id: nid(at),
    kind: "launch",
    at,
    title: `Auto-launch: ${name}`,
    sub: "creator fee to war chest",
    amount: fee,
    treasury: round2(treasuryBefore + fee),
  };
}

export function makeBoost(at: number, treasuryBefore: number): FeedEvent {
  const pack = pick(BOOST_PACKS);
  const cost = randInt(120, 240) / 100;
  return {
    id: nid(at),
    kind: "boost",
    at,
    title: `Dexscreener Boost x${pack}`,
    sub: "promoting $ADD",
    amount: -cost,
    treasury: round2(Math.max(0, treasuryBefore - cost)),
  };
}

export function makeAd(at: number, treasuryBefore: number): FeedEvent {
  const slot = pick(AD_SLOTS);
  const cost = randInt(100, 220) / 100;
  return {
    id: nid(at),
    kind: "ad",
    at,
    title: `DEX ad: ${slot}`,
    sub: "promoting $ADD",
    amount: -cost,
    treasury: round2(Math.max(0, treasuryBefore - cost)),
  };
}

export function seedFeed(count: number): { events: FeedEvent[]; treasury: number } {
  const now = Date.now();
  let treasury = 12.0;
  const events: FeedEvent[] = [];
  for (let i = 0; i < count; i++) {
    const at = now - (count - 1 - i) * 10000 - randInt(0, 2500);
    let ev: FeedEvent;
    if (i > 0 && i % 4 === 0) {
      ev = i % 8 === 0 ? makeAd(at, treasury) : makeBoost(at, treasury);
    } else {
      ev = makeLaunch(at, treasury);
    }
    treasury = ev.treasury;
    events.push(ev);
  }
  events.reverse();
  return { events, treasury };
}

export function shortAddress(addr: string): string {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

export function ageLabel(at: number, now: number): string {
  const s = Math.max(0, Math.floor((now - at) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export function formatMarketCap(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}

export function formatSol(n: number): string {
  return `${n.toFixed(2)} SOL`;
}
