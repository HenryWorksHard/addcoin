// Standalone video ad in the engine-side column, dressed in the same CRT-style
// frame as the late-night TV spot (TvAd). The clip lives at /ad/chart-ad.mp4.
// Autoplays muted + looped, no controls -- pure ambient ad. This is NOT the price
// chart; the live chart lives in the right rail.
export default function ChartAd() {
  return (
    <div className="tvad">
      <div className="xad-label">- Advertisement -</div>
      <div className="tvad-screen">
        <video
          className="tvad-video"
          src="/ad/chart-ad.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label="AdFund promo"
        />
        <span className="tvad-advice" aria-hidden>
          &#10003; FINANCIAL ADVICE
        </span>
        <span className="tvad-scan" aria-hidden />
      </div>
    </div>
  );
}
