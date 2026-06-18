import type { Metadata } from "next";
import "./globals.css";
import { LAUNCH_INTERVAL_LABEL, LAUNCH_BATCH_SIZE, AD_COINS } from "@/lib/coins";

const SITE_TITLE = "AdFund - The Coin That Lives To Promote Itself.";
const SITE_DESC = `AdFund promotes itself. Every pop-up ad is auto-minted as a pump.fun coin -- ${LAUNCH_BATCH_SIZE} fire every ${LAUNCH_INTERVAL_LABEL} from a rotating book of ${AD_COINS.length}, forever.`;

export const metadata: Metadata = {
  metadataBase: new URL("https://adfund.fun"),
  title: SITE_TITLE,
  description: SITE_DESC,
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESC,
    url: "https://adfund.fun",
    siteName: "AdFund",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "AdFund" }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: SITE_TITLE,
    description: SITE_DESC,
    images: ["/logo.png"],
  },
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
