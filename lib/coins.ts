export const ADD_TICKER = "AdFund";
export const ADD_NAME = "AdFund";
// Single source of truth for the contract address. Swap this one line at
// launch and every CA-derived link below goes live automatically.
export const ADD_CONTRACT = "coming soon";

// A real Solana mint is base58, 32-44 chars. While ADD_CONTRACT is a
// placeholder ("coming soon"), CA-derived deep links would 404, so linkFor()
// falls back to each platform's homepage until a real address is pasted above.
export const CA_LIVE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(ADD_CONTRACT);
export const TREASURY_WALLET = "WaRcH3sT7ADtreaSuRy9kQmPvLbNzRtYwEoUiAhJkXz";

// Socials + site -- fill these in when the accounts/domain exist.
export const SITE_URL = "https://addcoin.vercel.app";
export const X_HANDLE = "adfund";
export const X_URL = "https://x.com/adfund";
export const TELEGRAM_URL = "#";

// Live price chart (GeckoTerminal OHLCV). The pool/pair address doesn't exist
// until launch -- while ADD_POOL is empty the chart runs a simulated walk;
// paste the Solana pool address here at launch and it switches to real candles
// automatically. minute timeframe + CHART_AGGREGATE=5 = 5m candles ("5m" tag).
export const ADD_POOL = "";
export const GECKO_NETWORK = "solana";
export const CHART_TIMEFRAME = "minute";
export const CHART_AGGREGATE = 5;

// Every external link, keyed by the label shown in the UI. Token links are
// derived from ADD_CONTRACT; DexTools/Photon use pool-based deep links, so
// swap in the pair address at launch if you want those two exact.
export const PLATFORM_LINKS: Record<string, string> = {
  "pump.fun": `https://pump.fun/coin/${ADD_CONTRACT}`,
  Dexscreener: `https://dexscreener.com/solana/${ADD_CONTRACT}`,
  DexTools: `https://www.dextools.io/app/en/solana/pair-explorer/${ADD_CONTRACT}`,
  Birdeye: `https://birdeye.so/token/${ADD_CONTRACT}?chain=solana`,
  Photon: `https://photon-sol.tinyastro.io/en/lp/${ADD_CONTRACT}`,
  Jupiter: `https://jup.ag/swap/SOL-${ADD_CONTRACT}`,
  Raydium: `https://raydium.io/swap/?inputMint=sol&outputMint=${ADD_CONTRACT}`,
  Solscan: `https://solscan.io/token/${ADD_CONTRACT}`,
  GMGN: `https://gmgn.ai/sol/token/${ADD_CONTRACT}`,
  Holders: `https://solscan.io/token/${ADD_CONTRACT}#holders`,
  Telegram: TELEGRAM_URL,
  "X / Twitter": X_URL,
};

// Homepages used as the pre-launch fallback (see CA_LIVE). Only CA-derived
// platforms are listed -- Telegram / X keep their own real URLs either way.
const PLATFORM_HOMES: Record<string, string> = {
  "pump.fun": "https://pump.fun",
  Dexscreener: "https://dexscreener.com",
  DexTools: "https://www.dextools.io",
  Birdeye: "https://birdeye.so",
  Photon: "https://photon-sol.tinyastro.io",
  Jupiter: "https://jup.ag",
  Raydium: "https://raydium.io",
  Solscan: "https://solscan.io",
  GMGN: "https://gmgn.ai",
  Holders: "https://solscan.io",
};

// Returns "#" for labels with no real URL yet (War Chest, Web Ring, etc.).
// Before launch, CA-derived links resolve to the platform homepage instead of
// a broken /coin/<placeholder> deep link.
export function linkFor(label: string): string {
  if (!CA_LIVE && PLATFORM_HOMES[label]) return PLATFORM_HOMES[label];
  return PLATFORM_LINKS[label] ?? "#";
}

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

// Pop-up ads. Each entry is one self-contained ad: a fixed headline shown over
// its own backdrop image. Add, cut, or reword freely -- just drop a matching
// image in public/popups/ for each entry. All pop-ups share one window size.
export const POPUP_W = 179;
export const POPUP_H = 224;

export type PopupAd = { headline: string; image: string };

export const POPUP_ADS: PopupAd[] = [
  { headline: "HOT $AdFund in your area!", image: "/popups/ad-1.png" },
  { headline: "3 lonely trenchers near you just aped $AdFund", image: "/popups/ad-2.png" },
  { headline: "$AdFund is 0.4km away from you and wants you to invest", image: "/popups/ad-3.png" },
  { headline: "you WON a free bag of $AdFund!", image: "/popups/ad-4.png" },
  { headline: "claim your $AdFund airdrop NOW!", image: "/popups/ad-5.png" },
  { headline: "$AdFund wants you to pump it", image: "/popups/ad-6.png" },
  { headline: "make $$$ FAST from home with $AdFund!", image: "/popups/ad-7.png" },
  { headline: "turn 0.1 SOL into a LAMBO with $AdFund!", image: "/popups/ad-8.png" },
  { headline: "she quit her job after buying $AdFund", image: "/popups/ad-9.png" },
  { headline: "your PC is SLOW (it holds 0 $AdFund)", image: "/popups/ad-10.png" },
  { headline: "milfs are loading $AdFund right now", image: "/popups/ad-11.png" },
  { headline: "last chance before $AdFund 100x's", image: "/popups/ad-12.png" },
];

export function makePopupContent(excludeImages: string[] = []): PopupAd {
  const pool = POPUP_ADS.filter((a) => !excludeImages.includes(a.image));
  return pick(pool.length ? pool : POPUP_ADS);
}

// The ad book: every popup ad is also minted as a pump.fun coin by the launch
// engine, one every few seconds, cycling forever. Test placeholders for now --
// fill in each coin's name / symbol / image individually once the engine is
// verified. id maps 1:1 to popup slots (ad-1..12 / popups/ad-N.png).
export type AdCoin = {
  id: string;
  name: string;
  symbol: string;
  image: string;
};

export const AD_COINS: AdCoin[] = [
  { id: "ad-1", name: "test", symbol: "test", image: "" },
  { id: "ad-2", name: "test", symbol: "test", image: "" },
  { id: "ad-3", name: "test", symbol: "test", image: "" },
  { id: "ad-4", name: "test", symbol: "test", image: "" },
  { id: "ad-5", name: "test", symbol: "test", image: "" },
  { id: "ad-6", name: "test", symbol: "test", image: "" },
  { id: "ad-7", name: "test", symbol: "test", image: "" },
  { id: "ad-8", name: "test", symbol: "test", image: "" },
  { id: "ad-9", name: "test", symbol: "test", image: "" },
  { id: "ad-10", name: "test", symbol: "test", image: "" },
  { id: "ad-11", name: "test", symbol: "test", image: "" },
  { id: "ad-12", name: "test", symbol: "test", image: "" },
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
    sub: "promoting $AdFund",
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
    sub: "promoting $AdFund",
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
