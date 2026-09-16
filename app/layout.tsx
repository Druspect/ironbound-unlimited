import type { Metadata } from "next";
import CarriageLiveryControl from "./carriage-livery-control";
import "./globals.css";
import "./compact-landscape.css";
import "./input-accessibility.css";
import "./track-realism.css";
import "./starter-consist-realism.css";
import "./track-ground-truth.css";
import "./headlight-realism.css";
import "./undercarriage-reconciliation.css";
import "./carriage-liveries.css";
import "./production-polish.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ironbound-unlimited.geologistic.chatgpt.site"),
  title: "Ironbound: Unlimited",
  description: "A cinematic browser-native railway experience built around fluid motion, deep atmosphere, and responsive steam-era controls.",
  openGraph: {
    title: "Ironbound: Unlimited",
    description: "A cinematic browser-native railway experience.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Ironbound: Unlimited" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ironbound: Unlimited",
    description: "A cinematic browser-native railway experience.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" as="image" type="image/webp" href="/assets/high-plains.webp" />
      </head>
      <body><CarriageLiveryControl />{children}</body>
    </html>
  );
}
