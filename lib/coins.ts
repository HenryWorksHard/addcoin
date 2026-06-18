export const ADD_TICKER = "AdFund";
export const ADD_NAME = "AdFund";
// Single source of truth for the contract address. Swap this one line at
// launch and every CA-derived link below goes live automatically.
export const ADD_CONTRACT = "coming soon";

// A real Solana mint is base58, 32-44 chars. While ADD_CONTRACT is a
// placeholder ("coming soon"), CA-derived deep links would 404, so linkFor()
// falls back to each platform's homepage until a real address is pasted above.
export const CA_LIVE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(ADD_CONTRACT);

// ONE spot for the pump.fun coin link. Every Buy button and pump.fun link on the
// site resolves to PUMP_URL: the header "Buy", every pop-up BUY button, and the
// Tools/Boosted links. Paste your EXACT pump.fun link into PUMP_URL_OVERRIDE at
// launch and it auto-fills everywhere. Leave it "" to auto-derive from
// ADD_CONTRACT (pump.fun/coin/<CA>); pre-launch it falls back to the pump.fun
// homepage so no link 404s.
export const PUMP_URL_OVERRIDE = "";
export const PUMP_URL =
  PUMP_URL_OVERRIDE.trim() ||
  (CA_LIVE ? `https://pump.fun/coin/${ADD_CONTRACT}` : "https://pump.fun");

// Description stamped on EVERY ad-coin the worker mints. DERIVED from ADD_CONTRACT
// (the one CA spot): the moment you set the main contract above, every new pump.fun
// launch carries it -- turning each ad-coin into a pointer back to the real $AdFund.
// Until the CA is set it falls back to the plain pitch (no CA line). The worker uses
// this automatically unless LAUNCH_DESCRIPTION is set in .env.local (optional override).
export const LAUNCH_DESCRIPTION = CA_LIVE
  ? `Auto-launched by $AdFund -- the coin that promotes itself. Every pop-up ad on adfund.fun is a real coin. Buy the real $AdFund -- CA: ${ADD_CONTRACT} -- adfund.fun`
  : `Auto-launched by $AdFund -- the coin that promotes itself. Every pop-up ad on adfund.fun is a real coin. adfund.fun`;

export const TREASURY_WALLET = "WaRcH3sT7ADtreaSuRy9kQmPvLbNzRtYwEoUiAhJkXz";

// The wallet the launch engine mints every ad-coin from. Public address only --
// shown on the site so the engine's on-chain activity is verifiable by anyone.
export const LAUNCH_WALLET = "42i9E9Q8NnBHgcZEosyagc8guvx2LyVEUp99iNk1mkAj";

// Socials + site -- fill these in when the accounts/domain exist.
export const SITE_URL = "https://adfund.fun";
export const X_HANDLE = "adfunddotfun";
export const X_URL = "https://x.com/adfunddotfun";

// Drives the right-rail X card, which is styled to mirror the real
// @adfunddotfun profile WITHOUT depending on Twitter's embed widget (it
// routinely fails to load, especially for new accounts / with adblock on).
// Edit these to match the live profile:
//   avatar    -- public-relative path to the profile picture (defaults to the logo).
//   bio       -- the profile bio line.
//   verified  -- set true only if the account actually has the blue check.
//   following / followers -- real counts as strings (e.g. "1,204"); leave ""
//                            to hide the stats row until the account has them.
export const X_PROFILE = {
  name: "AdFund",
  handle: X_HANDLE,
  url: X_URL,
  avatar: "/favicon.png",
  bio: "One coin, one job -- promote itself. Every pop-up ad is auto-minted as a pump.fun coin, and the engine never stops.",
  website: "adfund.fun",
  verified: false,
  following: "",
  followers: "",
};
export const TELEGRAM_URL = "#";

// Live price chart (Solana Tracker OHLCV, keyed by the token MINT). Because it's
// mint-keyed it covers the coin's whole life in one feed: the pump.fun bonding
// curve PRE-bond and the DEX pool POST-bond. ADD_MINT DERIVES from ADD_CONTRACT
// -- on pump.fun the mint IS the contract address -- so setting ADD_CONTRACT once
// turns the chart on too, no separate edit. While ADD_CONTRACT is the placeholder
// the chart shows "TBA" (no sim, no polling). (Hard-code a literal mint here only
// if you ever want the chart to track a DIFFERENT token than the contract.) The
// browser never sees the API key -- the chart calls our /api/chart proxy, which
// holds SOLANA_TRACKER_API_KEY server-side. CHART_TYPE is the candle interval.
export const ADD_MINT = CA_LIVE ? ADD_CONTRACT : "";
export const CHART_TYPE = "5m";

// Every external link, keyed by the label shown in the UI. Token links are
// derived from ADD_CONTRACT; DexTools uses a pool-based deep link, so swap in
// the pair address at launch if you want that one exact.
export const PLATFORM_LINKS: Record<string, string> = {
  "pump.fun": PUMP_URL,
  Dexscreener: `https://dexscreener.com/solana/${ADD_CONTRACT}`,
  DexTools: `https://www.dextools.io/app/en/solana/pair-explorer/${ADD_CONTRACT}`,
  Telegram: TELEGRAM_URL,
  "X / Twitter": X_URL,
};

// Homepages used as the pre-launch fallback (see CA_LIVE). Only CA-derived
// platforms are listed -- Telegram / X keep their own real URLs either way.
const PLATFORM_HOMES: Record<string, string> = {
  "pump.fun": "https://pump.fun",
  Dexscreener: "https://dexscreener.com",
  DexTools: "https://www.dextools.io",
};

// Returns "#" for labels with no real URL yet (AdFund Chest, Web Ring, etc.).
// Before launch, CA-derived links resolve to the platform homepage instead of
// a broken /coin/<placeholder> deep link.
export function linkFor(label: string): string {
  // pump.fun always resolves to the single PUMP_URL (explicit override -> CA-
  // derived -> homepage), so an override works even before CA_LIVE flips.
  if (label === "pump.fun") return PUMP_URL;
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
  "DexTools hot pairs",
];

// Pop-up ads. Each entry is one self-contained ad: a fixed headline shown over
// its own backdrop image. Add, cut, or reword freely -- just drop a matching
// image in public/popups/ for each entry. All pop-ups share one window size.
export const POPUP_W = 179;
export const POPUP_H = 224;

export type PopupAd = { headline: string; image: string };

export const POPUP_ADS: PopupAd[] = [
  { headline: "HOT $AdFund in your area!", image: "/popups/ad-1.jpg" },
  { headline: "3 lonely trenchers near you just aped $AdFund", image: "/popups/ad-2.jpg" },
  { headline: "$AdFund is 0.4km away from you and wants you to invest", image: "/popups/ad-3.jpg" },
  { headline: "you WON a free bag of $AdFund!", image: "/popups/ad-4.jpg" },
  { headline: "claim your $AdFund airdrop NOW!", image: "/popups/ad-5.jpg" },
  { headline: "$AdFund wants you to pump it", image: "/popups/ad-6.jpg" },
  { headline: "make $$$ FAST from home with $AdFund!", image: "/popups/ad-7.jpg" },
  { headline: "turn 0.1 SOL into a LAMBO with $AdFund!", image: "/popups/ad-8.jpg" },
  { headline: "she quit her job after buying $AdFund", image: "/popups/ad-9.jpg" },
  { headline: "your PC is SLOW (it holds 0 $AdFund)", image: "/popups/ad-10.jpg" },
  { headline: "milfs are loading $AdFund right now", image: "/popups/ad-11.jpg" },
  { headline: "last chance before $AdFund 100x's", image: "/popups/ad-12.jpg" },
];

export function makePopupContent(excludeImages: string[] = []): PopupAd {
  const pool = POPUP_ADS.filter((a) => !excludeImages.includes(a.image));
  return pick(pool.length ? pool : POPUP_ADS);
}

// The ad BOOK -- the full roster of coins the engine cycles through. Each cycle
// the engine fires a sequential WINDOW of LAUNCH_BATCH_SIZE coins (not the whole
// book), then advances the window by that many and fires again on the next
// interval -- so over (book / batch) cycles every coin has launched once, then
// it repeats, forever. With 12 coins and a batch of 3 that's 4 cycles (a full
// rotation every ~60s) and 4x the ad variety at the same mint rate as firing 3.
//
// Keep the book length a MULTIPLE of LAUNCH_BATCH_SIZE so the windows stay
// aligned (12 / 3 = clean 0-2, 3-5, 6-8, 9-11 windows).
//
// TO LOAD REAL METADATA, edit each entry below:
//   id     -- stable internal key; keep it unique, no need to change it.
//   name   -- the coin's full name on pump.fun, e.g. "Turbo Doge".
//   symbol -- the ticker, e.g. "TDOGE" (pump.fun upper-cases it).
//   image  -- public-relative path to the coin art, e.g. "/coins/turbo-doge.png".
//             Drop the actual file under public/ at that path. This same value
//             feeds both the on-site thumbnail and the minted coin's image.
//             If left "", the launcher falls back to public/popups/<id>.jpg.
// Shared per-coin metadata: the DESCRIPTION auto-derives from ADD_CONTRACT (see
// LAUNCH_DESCRIPTION near the top) so every mint carries the main CA once it's set;
// twitter/telegram/website are set ONCE via .env.local (LAUNCH_TWITTER,
// LAUNCH_TELEGRAM, LAUNCH_WEBSITE), with LAUNCH_DESCRIPTION as an optional override.
export type AdCoin = {
  id: string;
  name: string;
  symbol: string;
  image: string;
};

export const AD_COINS: AdCoin[] = [
  { id: "ad-1", name: "Hot AdFund In Your Area", symbol: "AdFund", image: "/coins/ad-1.png" },
  { id: "ad-2", name: "Lonely AdFund Near You", symbol: "AdFund", image: "/coins/ad-2.png" },
  { id: "ad-3", name: "AdFund Wants You Inside It", symbol: "AdFund", image: "/coins/ad-3.png" },
  { id: "ad-4", name: "You Won A Free AdFund Bag", symbol: "AdFund", image: "/coins/ad-4.png" },
  { id: "ad-5", name: "Claim Your AdFund Airdrop", symbol: "AdFund", image: "/coins/ad-5.png" },
  { id: "ad-6", name: "AdFund Wants You To Pump It", symbol: "AdFund", image: "/coins/ad-6.png" },
  { id: "ad-7", name: "Make $ From Home With AdFund", symbol: "AdFund", image: "/coins/ad-7.png" },
  { id: "ad-8", name: "Turn 0.1 SOL Into A Lambo", symbol: "AdFund", image: "/coins/ad-8.png" },
  { id: "ad-9", name: "She Quit Her Job Buying AdFund", symbol: "AdFund", image: "/coins/ad-9.png" },
  { id: "ad-10", name: "Your Wallet Holds 0 AdFund", symbol: "AdFund", image: "/coins/ad-10.png" },
  { id: "ad-11", name: "Milfs Are Loading AdFund", symbol: "AdFund", image: "/coins/ad-11.png" },
  { id: "ad-12", name: "Last Chance Before 100x", symbol: "AdFund", image: "/coins/ad-12.png" },
];

// Launch cadence + batch -- ONE source of truth for the whole app: the worker's
// default interval, the in-browser sim countdown, the rotating-window size, and
// every "N of M every T" label on the site all derive from these. Change them
// here and the engine + copy stay in sync.
// (Per-env overrides on the worker: LAUNCH_INTERVAL_MS, LAUNCH_BATCH_SIZE.)
export const LAUNCH_INTERVAL_SECONDS = 15; // 15 seconds between batches
export const LAUNCH_INTERVAL_LABEL = "15s";
// Coins minted per cycle -- a sliding window over AD_COINS, not the whole book.
export const LAUNCH_BATCH_SIZE = 3;

// Per-launch SOL cost, measured on-chain (network fee + rent for the new mint /
// metadata / bonding-curve accounts). Used only to display cumulative launch
// spend in the engine readout: coins launched x this number.
export const SOL_PER_LAUNCH = 0.0074;

// The AdFund hub wallet -- the treasury the whole engine runs on. It receives
// the 50% creator-fee share pump.fun routes from the main $AdFund coin PLUS the
// ad-coin fees the agent claims and sweeps over from the launch wallet. It pays
// for every Dexscreener boost/ad and refuels the launch wallet. SEPARATE from
// the launch wallet so each has exactly one job.
//
// LIVE (auto): set PROMO_WALLET_ADDRESS in the env and the site reads that
// wallet's on-chain SOL spend via /api/promo-spend (see lib/promoSpend.ts). To
// split the total into Boosts vs Ads, also set DEX_BOOST_ADDRESSES and
// DEX_AD_ADDRESSES (comma-separated Dexscreener payment addresses) -- any spend
// not matched to one shows as "Unclassified" until it is tagged. Optional knobs:
// PROMO_RPC_URL, PROMO_MAX_SIGS, PROMO_CACHE_MS.
//
// MANUAL (fallback): when PROMO_WALLET_ADDRESS is unset, the panel shows the
// figures below instead. Fill them in (and set wallet) to report spend by hand.
export type DexPromo = { wallet: string; boostsSol: number; adsSol: number };
export const DEX_PROMO: DexPromo = {
  wallet: "CAzYtU2GMqJAdyVeQZ52HQnPqjkXp3fp84aD7b3pQUyZ", // public AdFund-wallet address (shown as "funded by")
  boostsSol: 0, // cumulative SOL spent on Dexscreener Boosts (trending)
  adsSol: 0, // cumulative SOL spent on Dexscreener Ads (banners / featured)
};

// Auto-refuel: the worker keeps the launch wallet funded so the engine never
// stalls. When the launch wallet's balance drops to/below thresholdSol, it sends
// amountSol from the AdFund hub wallet (DEX_PROMO.wallet) to the launch wallet.
// These defaults drive BOTH the worker (override per-env with
// TOPUP_THRESHOLD_SOL / TOPUP_AMOUNT_SOL) and the on-site "auto-refuel" ad copy,
// so the number shown always matches the rule the worker runs.
export const AUTO_TOPUP = {
  thresholdSol: 0.5,
  amountSol: 0.5,
};

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
    sub: "creator fee to AdFund Chest",
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

// Countdown readout for the launch cadence. Seconds under a minute render as
// "45s"; anything >=60s renders as "M:SS" (e.g. 90 -> "1:30") so a larger custom
// interval doesn't show up as a nonsense bare-seconds count.
export function formatCountdown(s: number): string {
  const sec = Math.max(0, Math.floor(s));
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
