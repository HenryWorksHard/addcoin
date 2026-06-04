"use client";

import { useState } from "react";
import { shortAddress } from "@/lib/coins";

// Small click-to-copy address pill. Shows a shortened address and copies the
// full one to the clipboard -- no third-party explorer link needed, so it adds
// no external brand/trace. Used to surface the launch wallet and promo wallet.
export default function WalletChip({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(address).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <button
      type="button"
      className="wallet-chip"
      onClick={copy}
      title={`Copy ${address}`}
    >
      <span className="wallet-chip-addr">{shortAddress(address)}</span>
      <span className="wallet-chip-copy">{copied ? "copied" : "copy"}</span>
    </button>
  );
}
