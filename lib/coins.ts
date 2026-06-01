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

export const POPUP_REASONS = [
  "just got a DEXSCREENER BOOST",
  "DEX AD is now LIVE",
  "is TRENDING on Solana",
  "war chest just bought a boost",
  "is being shilled on every DEX",
];

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
