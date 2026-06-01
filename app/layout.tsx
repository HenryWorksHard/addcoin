import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ADDCOIN - Microsoft Internet Explorer",
  description: "ADDCOIN promotes itself. Auto-launches every 10s fund a war chest that buys DEX boosts and ads for $ADD.",
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
