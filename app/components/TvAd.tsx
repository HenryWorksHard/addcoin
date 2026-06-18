// Right-rail video ad dressed as a late-night 90s TV spot. The clip itself --
// with its baked-in 1-900 lower-third copy -- lives at /ad/tv-ad.mp4; everything
// here is just the CRT-style frame around it: a "Paid Programming" label, a
// blinking ON AIR badge, and a faint scanline overlay to sell the degraded
// broadcast look. Autoplays muted + looped so it always runs, no sound, no
// controls -- pure ambient ad, same as the other right-column promos.
export default function TvAd() {
  return (
    <div className="tvad">
      <div className="xad-label">- Paid Programming -</div>
      <div className="tvad-screen">
        <video
          className="tvad-video"
          src="/ad/tv-ad.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label="AdFund late-night commercial"
        />
        <span className="tvad-onair" aria-hidden>
          <span className="tvad-onair-dot" />
          ON AIR
        </span>
        <span className="tvad-scan" aria-hidden />
      </div>
    </div>
  );
}
