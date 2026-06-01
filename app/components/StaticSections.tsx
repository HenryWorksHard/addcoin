import React from "react";

export function GeoHeader() {
  return (
    <div className="geo-header">
      <div className="wordmark">
        <span className="coin-doodle" aria-hidden>
          $
        </span>
        <span className="add">ADD</span>
        <span className="coin">COIN</span>
        <span className="dotsol">.sol</span>
      </div>
      <div className="header-links">
        <a href="#">pump.fun</a> - <a href="#">Help</a>
      </div>
    </div>
  );
}

export function WelcomeBar({
  adBlock,
  onToggle,
  blocked,
}: {
  adBlock: boolean;
  onToggle: () => void;
  blocked: number;
}) {
  return (
    <div className="welcome">
      <div className="left">
        <span>
          Welcome, Degen - <a href="#">[Connect Wallet]</a>
        </span>
        <span
          className={`adblock bevel-out${adBlock ? " on" : ""}`}
          onClick={onToggle}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onToggle();
          }}
          title="Toggle pop-up ads"
        >
          <span className="led" aria-hidden />
          AD BLOCKER: {adBlock ? "ON" : "OFF"}
          {adBlock && blocked > 0 ? <span>&nbsp;({blocked} blocked)</span> : null}
        </span>
      </div>
      <div className="right">
        <a className="freecoin" href="#">
          Get a free coin <span className="chev">&#9654;</span>
        </a>
      </div>
    </div>
  );
}

const ACTIONS = [
  {
    glyph: "rocket",
    title: "LAUNCH A COIN",
    desc: "Deploy a new token on pump.fun in seconds.",
  },
  {
    glyph: "wallet",
    title: "MANAGE COINS",
    desc: "Track and edit all of your launches.",
  },
  {
    glyph: "upload",
    title: "UPLOAD ART",
    desc: "Import logos, banners and metadata.",
  },
];

function ActionGlyph({ kind }: { kind: string }) {
  const base: React.CSSProperties = {
    width: 34,
    height: 34,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
    color: "#fff",
  };
  if (kind === "rocket") return <span style={base}>&#9650;</span>;
  if (kind === "wallet") return <span style={base}>&#9638;</span>;
  return <span style={base}>&#8682;</span>;
}

export function ActionButtons() {
  return (
    <div className="actions">
      {ACTIONS.map((a) => (
        <div className="action" key={a.title}>
          <span className="glyph" aria-hidden>
            <ActionGlyph kind={a.glyph} />
          </span>
          <span className="copy">
            <span className="t">{a.title}</span>
            <span className="d">{a.desc}</span>
          </span>
          <span className="arrow" aria-hidden>
            &#9656;
          </span>
        </div>
      ))}
    </div>
  );
}

export function SearchCoins() {
  return (
    <>
      <div className="bar blue">Search Coins</div>
      <div className="searchbox">
        <input type="text" placeholder="ticker, name or contract..." aria-label="Search coins" />
        <button type="button" className="btn98 bevel-out">
          Search
        </button>
      </div>
    </>
  );
}

const CATEGORIES = [
  { nm: "Area51", ds: "(ai, agents)" },
  { nm: "Hollywood", ds: "(celeb coins)" },
  { nm: "TimesSquare", ds: "(gaming, p2e)" },
  { nm: "Colosseum", ds: "(gambling, degen)" },
  { nm: "SouthBeach", ds: "(defi, yield)" },
  { nm: "Tokyo", ds: "(anime, waifu)" },
  { nm: "Heartland", ds: "(classic memes)" },
  { nm: "SunsetStrip", ds: "(dog & cat coins)" },
  { nm: "WestHollywood", ds: "(community)" },
];

export function ExploreCategories() {
  return (
    <>
      <div className="bar blue">Explore Categories</div>
      <div className="cats-intro">
        Find members&apos; coins in one of our <a href="#">41 categories</a>
      </div>
      <div className="cats">
        {CATEGORIES.map((c) => (
          <div className="cat" key={c.nm}>
            <a href="#" className="nm">
              {c.nm}
            </a>
            <div className="ds">{c.ds}</div>
          </div>
        ))}
      </div>
      <div className="viewall">
        <a href="#">view all...</a>
      </div>
    </>
  );
}

export function NewAndNotable() {
  return (
    <div className="col-right">
      <div className="bar green">New and Notable</div>
      <div className="notable-item">
        <h4>
          <a href="#">pump.fun Pro 2000</a>
        </h4>
        <p>
          Snipe new launches the instant they deploy. Take advantage of auto-buy,
          bundle detection and dev wallet tracking.
        </p>
      </div>
      <div className="notable-item">
        <h4>
          <a href="#">Try Addcoin Wizards</a>
        </h4>
        <p>
          Want to crank out a coin quickly and easily? Answer a few questions and
          Addcoin will help you launch a professional-looking token in minutes.
        </p>
      </div>
      <div className="sponsor">
        <div className="kicker">SPONSORED</div>
        <div className="net">
          <span className="globe" aria-hidden />
          PHANTOM WALLET
        </div>
        <div style={{ fontSize: 11, color: "#444" }}>
          The friendly crypto wallet built for Solana. Connect in one click.
        </div>
      </div>
    </div>
  );
}

const ADDONS = [
  { grp: "Charts & Analytics", links: ["Live Chart", "Holder Map", "Bubble Maps"] },
  { grp: "Instant Info", links: ["Price Tickers", "Holder Count", "Volume Bots"] },
  { grp: "Art", links: ["Animated Logo", "Gliding Banners", "Pixel Mascots"] },
  { grp: "Interactive", links: ["Guestbook", "Hit Counter", "Web Ring"] },
];

export function CoinAddOns() {
  return (
    <>
      <div className="bar blue">Cool Coin Add-Ons</div>
      <div className="addons">
        {ADDONS.map((g) => (
          <div className="grp" key={g.grp}>
            <b>{g.grp}</b>
            <div>
              {g.links.map((l, i) => (
                <React.Fragment key={l}>
                  <a href="#">{l}</a>
                  {i < g.links.length - 1 ? <span>, </span> : null}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
