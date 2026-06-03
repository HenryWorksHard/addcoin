import { AdCoin } from "./coins";

export type LaunchResult = { mint: string; signature: string };

export interface Launcher {
  launch(coin: AdCoin): Promise<LaunchResult>;
}

const MINT_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789";

function fakeMint(): string {
  let s = "";
  for (let i = 0; i < 39; i++) {
    s += MINT_CHARS[Math.floor(Math.random() * MINT_CHARS.length)];
  }
  return s + "pump";
}

// Default launcher: pretends to mint (no chain, no cost). The real
// PumpPortal-backed launcher drops in here behind an env flag once a funded
// wallet and an always-on worker exist -- the engine calls launch() either way.
export const simLauncher: Launcher = {
  async launch(): Promise<LaunchResult> {
    await new Promise((r) => setTimeout(r, 500));
    return { mint: fakeMint(), signature: `sim-${Date.now()}` };
  },
};

export const launcher: Launcher = simLauncher;
