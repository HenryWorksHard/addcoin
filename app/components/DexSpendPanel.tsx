import { DEX_PROMO, formatSol } from "@/lib/coins";
import WalletChip from "./WalletChip";

// Live on-chain read served by /api/promo-spend (mirrors lib/promoSpend.ts
// PromoSpend). Redeclared here so the client bundle never imports the server
// module (which pulls in @solana/web3.js).
export type PromoLive = {
  wallet: string;
  totalSol: number;
  boostsSol: number;
  adsSol: number;
  otherSol: number;
  txCount: number;
  updatedAt: number;
};

// Spend tracker that sits next to the launch terminal. Mirrors the dark retro
// readout style and reports what the SEPARATE promo wallet has spent boosting
// $AdFund on Dexscreener, split into the two things that money funds.
//
// When `promo` is present (PROMO_WALLET_ADDRESS is set and the RPC read worked)
// the numbers are live on-chain; otherwise it falls back to the manual DEX_PROMO
// figures in lib/coins.ts so the panel always renders something honest.
export default function DexSpendPanel({
  promo,
  balanceSol,
}: {
  promo?: PromoLive | null;
  balanceSol?: number | null;
}) {
  const live = promo && promo.wallet ? promo : null;

  const wallet = live?.wallet || DEX_PROMO.wallet;
  const boostsSol = live ? live.boostsSol : DEX_PROMO.boostsSol;
  const adsSol = live ? live.adsSol : DEX_PROMO.adsSol;
  const otherSol = live ? live.otherSol : 0;
  const total = live ? live.totalSol : DEX_PROMO.boostsSol + DEX_PROMO.adsSol;

  // Only surface an "unclassified" row when there is meaningful spend the chain
  // could not yet tag to a Boost/Ad address (i.e. before those addresses are set).
  const showAds = adsSol > 0.005;
  const showOther = otherSol > 0.005;

  return (
    <div className="dex-spend">
      <div className="bar red dex-head">
        <span>Dexscreener Spend</span>
        <span className="dex-meta">{live ? "promo wallet · live" : "promo wallet"}</span>
      </div>
      <div className="dex-card">
        <div className="dex-total-k">Spent promoting $AdFund</div>
        <div className="dex-total-v">{formatSol(total)}</div>

        <div className="dex-rows">
          <div className="dex-row">
            <span className="dex-row-id">
              <b className="dex-row-nm">Dex Boosts</b>
              <span className="dex-row-ds">trending boosts</span>
            </span>
            <b className="dex-row-v">{formatSol(boostsSol)}</b>
          </div>
          {showAds ? (
            <div className="dex-row">
              <span className="dex-row-id">
                <b className="dex-row-nm">Dex Ads</b>
                <span className="dex-row-ds">banner / featured slots</span>
              </span>
              <b className="dex-row-v">{formatSol(adsSol)}</b>
            </div>
          ) : null}
          {showOther ? (
            <div className="dex-row">
              <span className="dex-row-id">
                <b className="dex-row-nm">Unclassified</b>
                <span className="dex-row-ds">awaiting Dex address tag</span>
              </span>
              <b className="dex-row-v">{formatSol(otherSol)}</b>
            </div>
          ) : null}
          {typeof balanceSol === "number" ? (
            <div className="dex-row dex-row-bal">
              <span className="dex-row-id">
                <b className="dex-row-nm">AdFund balance</b>
                <span className="dex-row-ds">available to boost</span>
              </span>
              <b className="dex-row-v">{formatSol(balanceSol)}</b>
            </div>
          ) : null}
        </div>

        <div className="dex-foot">
          {wallet ? (
            <span className="dex-foot-row">
              funded by <WalletChip address={wallet} /> &middot; separate from the AdFund Launch Balance
            </span>
          ) : (
            <>from a separate promo wallet -- tracking starts once it is funded</>
          )}
        </div>
      </div>
    </div>
  );
}
