// Extra "trust" seals stacked under the engine-side video ad, filling the gap
// next to the launch book. Same parody-seal styling as the main wall (.tbadge),
// but a wrapping 3-up grid sized for the narrow 232px column. Pure decoration.
const SIDE_SEALS = [
  { ico: "★", top: "NOT A", sub: "RUG*", tone: "a" },
  { ico: "✓", top: "100%", sub: "ORGANIC", tone: "b" },
  { ico: "◆", top: "BAGS", sub: "SECURED", tone: "d" },
  { ico: "★", top: "WIFE", sub: "APPROVED", tone: "c" },
  { ico: "▲", top: "ZERO", sub: "TAXES*", tone: "f" },
  { ico: "✓", top: "TO THE", sub: "MOON", tone: "e" },
];

export default function SideBadges() {
  return (
    <div className="badge-wall side-badges">
      {SIDE_SEALS.map((b, i) => (
        <span className={`tbadge tbadge-${b.tone}`} key={`${b.top}-${i}`} title="Verified*">
          <span className="tbadge-ico" aria-hidden>
            {b.ico}
          </span>
          <span className="tbadge-txt">
            <b>{b.top}</b>
            <span>{b.sub}</span>
          </span>
        </span>
      ))}
    </div>
  );
}
