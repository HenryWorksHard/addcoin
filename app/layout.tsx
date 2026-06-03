import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://adfund.fun"),
  title: "AdFund - Microsoft Internet Explorer",
  description: "AdFund promotes itself. Every pop-up ad is auto-minted as a pump.fun coin -- one every 5s, cycling forever.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
