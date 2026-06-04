import React from "react";

function ToolButton({ label, withArrow }: { label: string; withArrow?: boolean }) {
  return (
    <div className="tool-btn">
      <span className="ico" aria-hidden>
        {iconFor(label)}
      </span>
      <span>{label}</span>
      {withArrow ? <span className="tool-arrow" /> : null}
    </div>
  );
}

function iconFor(label: string): React.ReactNode {
  const common: React.CSSProperties = { fontWeight: "bold", fontSize: 13, lineHeight: "16px" };
  switch (label) {
    case "Back":
      return <span style={{ ...common, color: "#1c3f96" }}>&#8592;</span>;
    case "Forward":
      return <span style={{ ...common, color: "#808080" }}>&#8594;</span>;
    case "Stop":
      return <span style={{ ...common, color: "#cc0000" }}>&#10005;</span>;
    case "Refresh":
      return <span style={{ ...common, color: "#0a7a06" }}>&#8635;</span>;
    case "Home":
      return <span style={{ ...common, color: "#1c3f96" }}>&#8962;</span>;
    case "Search":
      return <span style={{ ...common, color: "#6a1b9a" }}>&#9906;</span>;
    case "Favorites":
      return <span style={{ ...common, color: "#f2c200" }}>&#9733;</span>;
    case "History":
      return <span style={{ ...common, color: "#00838f" }}>&#8986;</span>;
    default:
      return null;
  }
}

export default function BrowserChrome({
  url,
  children,
  statusLeft,
  statusMid,
}: {
  url: string;
  children: React.ReactNode;
  statusLeft: React.ReactNode;
  statusMid: React.ReactNode;
}) {
  return (
    <div className="browser">
      <div className="titlebar">
        <span className="ie-icon" aria-hidden />
        <span className="title-text">AdFund - The Coin That Lives To Promote Itself.</span>
        <div className="title-btns">
          <span className="title-btn bevel-out" aria-hidden>
            _
          </span>
          <span className="title-btn bevel-out" aria-hidden>
            &#9633;
          </span>
          <span className="title-btn bevel-out" aria-hidden>
            &#10005;
          </span>
        </div>
      </div>

      <div className="menubar">
        <span>
          <u>F</u>ile
        </span>
        <span>
          <u>E</u>dit
        </span>
        <span>
          <u>V</u>iew
        </span>
        <span>
          F<u>a</u>vorites
        </span>
        <span>
          <u>T</u>ools
        </span>
        <span>
          <u>H</u>elp
        </span>
      </div>

      <div className="toolbar">
        <ToolButton label="Back" withArrow />
        <ToolButton label="Forward" />
        <ToolButton label="Stop" />
        <ToolButton label="Refresh" />
        <ToolButton label="Home" />
        <span className="tool-sep" />
        <ToolButton label="Search" />
        <ToolButton label="Favorites" />
        <ToolButton label="History" />
      </div>

      <div className="addressbar">
        <span className="lbl">Address</span>
        <div className="address-field bevel-in">
          <span className="page-ico" aria-hidden />
          <span className="url">{url}</span>
        </div>
        <div className="go-btn bevel-out">
          <span className="go-arrow" aria-hidden />
          Go
        </div>
      </div>

      <div className="page">{children}</div>

      <div className="statusbar">
        <span className="status-cell bevel-in">{statusLeft}</span>
        <span className="status-cell grow bevel-in">{statusMid}</span>
        <span className="status-cell bevel-in status-zone">
          <span className="globe" aria-hidden style={{ width: 12, height: 12 }} />
          Internet
        </span>
      </div>
    </div>
  );
}
