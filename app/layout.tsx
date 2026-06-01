import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ADDCOIN - Microsoft Internet Explorer",
  description: "Launch a coin every 10 seconds. The internet's home for fresh pump.fun launches.",
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
