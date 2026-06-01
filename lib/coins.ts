export type Coin = {
  id: string;
  name: string;
  ticker: string;
  contract: string;
  marketCap: number;
  price: number;
  change: number;
  launchedAt: number;
  color: string;
  category: string;
};

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

const CATEGORIES = [
  "Area51", "Colosseum", "Heartland", "Hollywood", "SouthBeach",
  "SunsetStrip", "TimesSquare", "Tokyo", "WestHollywood",
];

const COLORS = [
  "#d4001a", "#ff7a00", "#f2c200", "#1a9e4b", "#0066cc", "#6a1b9a",
  "#00897b", "#c2185b", "#3949ab", "#5d4037", "#00838f", "#7cb342",
];

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function mintAddress(): string {
  let s = "";
  for (let i = 0; i < 40; i++) s += BASE58[Math.floor(Math.random() * BASE58.length)];
  return s + "pump";
}

let counter = 0;

export function generateCoin(launchedAt: number = Date.now()): Coin {
  const adj = pick(ADJECTIVES);
  const noun = pick(NOUNS);
  counter += 1;
  return {
    id: `${launchedAt}-${counter}-${Math.random().toString(36).slice(2, 7)}`,
    name: `${adj} ${noun}`,
    ticker: (adj.slice(0, 3) + noun.slice(0, 3)).toUpperCase(),
    contract: mintAddress(),
    marketCap: randInt(4, 80) * 1000 + randInt(0, 999),
    price: Number((Math.random() * 0.0009 + 0.0000001).toFixed(8)),
    change: randInt(-45, 320),
    launchedAt,
    color: pick(COLORS),
    category: pick(CATEGORIES),
  };
}

export function seedCoins(count: number): Coin[] {
  const now = Date.now();
  const out: Coin[] = [];
  for (let i = 0; i < count; i++) {
    out.push(generateCoin(now - i * 10000 - randInt(0, 4000)));
  }
  return out;
}

export function shortAddress(addr: string): string {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

export function ageLabel(launchedAt: number, now: number): string {
  const s = Math.max(0, Math.floor((now - launchedAt) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export function formatMarketCap(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n}`;
}
