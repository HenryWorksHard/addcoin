"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X_PROFILE, X_URL, ADD_TICKER } from "@/lib/coins";

// Right-rail X (Twitter) profile card -- light/white theme, mirroring the real
// profile header: banner, circular pfp overlapping it, name + handle, a short
// bio, the Follow button (links straight to the live account), a live mock
// post under the profile that rotates through the promo lines every 10s, and a
// "Post" button that opens X's composer pre-filled with WHATEVER line is
// currently showing in that mock post. The post button never auto-publishes --
// it just hands X a drafted tweet; the user taps Post themselves.
//
// Banner + pfp are CSS background images pointing at /x/banner.png and
// /x/pfp.png. If those files aren't present yet the frame just shows its
// fallback colors (no broken-image icon), so the layout always renders.

const SITE = "adfund.fun";

// How often the mock post cycles to the next line.
const ROTATE_MS = 10000;

// Rotating posts the X button drafts. Kept short, on-brand, link back to site.
const X_POSTS = [
  `Every popup ad on this page is a real coin. $${ADD_TICKER} constantly launches coins to promote itself on new pairs. The ads never stop. ${SITE}`,
  `I just hold $${ADD_TICKER} and the coin promotes itself. Can finally sit on my hands and watch my money grow. ${SITE}`,
  `$${ADD_TICKER} doesn't need bagworking, it works its own bag. Newpair ads, dex boosts, dex ads, you name it. ${SITE}`,
  `While you were sleeping, $${ADD_TICKER} launched another batch and boosted itself across every Solana terminal. ${SITE}`,
  `The only coin with a full-time job: promoting itself. $${ADD_TICKER}. ${SITE}`,
  `New pairs every 15 sec, boosted on autopilot. $${ADD_TICKER} spends all its rewards promoting itself. ${SITE}`,
  `Stop shilling alone. $${ADD_TICKER} shills itself. Sit and watch your bags grow. ${SITE}`,
  `$${ADD_TICKER}: the coin that lives to promote itself. you hold, it does the rest. ${SITE}`,
  `Real launches, real boosts, every penny of the rewards spent to boost itself. That's $${ADD_TICKER}. ${SITE}`,
  `The ad-cycle never stops. $${ADD_TICKER} launches coins, boosts, repeats - forever. ${SITE}`,
];

export default function XProfileCard() {
  // Which promo line is currently showing in the mock post (and therefore what
  // the Post button will draft). Advances on a fixed interval.
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % X_POSTS.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  const openPost = () => {
    const text = X_POSTS[idx];
    const url = "https://x.com/intent/post?text=" + encodeURIComponent(text);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="xad">
      <div className="xad-label">- Advertisement -</div>
      <div className="xcard">
        <div className="xcard-banner" aria-hidden>
          <Image src="/x/banner.png" alt="" fill sizes="280px" style={{ objectFit: "cover" }} />
        </div>
        <div className="xcard-top">
          <span className="xcard-pfp" aria-hidden>
            <Image src="/x/pfp.png" alt="" fill sizes="58px" style={{ objectFit: "cover" }} />
          </span>
          <a
            className="xcard-follow"
            href={X_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Follow
          </a>
        </div>
        <div className="xcard-body">
          <div className="xcard-name">{X_PROFILE.name}</div>
          <div className="xcard-handle">@{X_PROFILE.handle}</div>
          <div className="xcard-bio">The Coin That Lives To Promote Itself.</div>
        </div>

        {/* Live mock post -- cycles through X_POSTS every ROTATE_MS. The text
            shown here is exactly what the Post button below will draft. */}
        <div className="xcard-feed">
          <span className="xcard-feed-pfp" aria-hidden>
            <Image src="/x/pfp.png" alt="" fill sizes="36px" style={{ objectFit: "cover" }} />
          </span>
          <div className="xcard-feed-main">
            <div className="xcard-feed-head">
              <span className="xcard-feed-name">{X_PROFILE.name}</span>
              <span className="xcard-feed-handle">@{X_PROFILE.handle}</span>
              <span className="xcard-feed-sep" aria-hidden>
                &middot;
              </span>
              <span className="xcard-feed-time">now</span>
            </div>
            <p className="xcard-feed-text" key={idx}>
              {X_POSTS[idx]}
            </p>
          </div>
        </div>

        <div className="xcard-cta">
          <button
            type="button"
            className="xcard-post"
            onClick={openPost}
            aria-label={`Post about $${ADD_TICKER} on X`}
          >
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
