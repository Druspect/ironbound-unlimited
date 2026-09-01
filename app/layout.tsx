import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
