import { ageLabel, formatSol } from "@/lib/coins";

type LastTopUp = { amountSol: number; sig: string | null; at: number };

// The auto-refuel readout, dressed up as a small retro "sponsored" widget that
// sits under the Dexscreener spend panel to fit the site's whole bit (everything
// here is an ad). Pure display: it shows the standing rule (top up by `amount`
// whenever the launch wallet dips to/below `threshold`), the live wallet balances,
// and the last refuel the worker actually broadcast. The money move itself happens
// server-side in the worker -- nothing here triggers it.
export default function AutoRefuelAd({
  launchBalance,
  dexBalance,
  threshold,
  amount,
  lastTopUp,
}: {
  launchBalance: number | null;
  dexBalance: number | null;
  threshold: number;
  amount: number;
  lastTopUp: LastTopUp | null;
}) {
  const low = launchBalance != null && launchBalance <= threshold;
  return (
    <div className="refuel-ad">
      <div className="refuel-ad-label">- Sponsored -</div>
      <div className="refuel-ad-body">
        <div className="refuel-ad-head">
          <b className="refuel-ad-title">AUTO-REFUEL ENGINE&trade;</b>
          <span className={`refuel-ad-badge${low ? " low" : ""}`}>
            <span className="refuel-led" aria-hidden />
            {low ? "REFUELING" : "ARMED"}
          </span>
        </div>
        <div className="refuel-ad-pitch">The AdFund Launch Balance NEVER runs dry!</div>
        <div className="refuel-ad-desc">
          Auto-sends <b>{formatSol(amount)}</b> the instant the AdFund Launch Balance dips
          to <b>{formatSol(threshold)}</b> or below.
        </div>
        <div className="refuel-ad-stats">
          <span className="refuel-ad-stat">
            AdFund Launch Balance <b>{launchBalance == null ? "--" : formatSol(launchBalance)}</b>
          </span>
          <span className="refuel-ad-stat">
            fuel reserve <b>{dexBalance == null ? "--" : formatSol(dexBalance)}</b>
          </span>
          {lastTopUp ? (
            <span className="refuel-ad-stat">
              last refuel <b>{formatSol(lastTopUp.amountSol)}</b>{" "}
              {ageLabel(lastTopUp.at, Date.now())}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
