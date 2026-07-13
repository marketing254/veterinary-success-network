import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "./vsn-extra.css";
import RevealObserver from "@/components/RevealObserver";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const body = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-body" });

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://veterinarysuccessnetwork.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Veterinary Success Network | Every practice problem gets a written action plan",
  description:
    "The only veterinary network where every practice problem gets a written action plan in 2–3 business days, plus a growing resource library, member-only partner deals, live AMAs & CE, and a community of owners. Powered by Veterinary Business Institute.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "Veterinary Success Network",
    images: [
      {
        url: `${SITE}/assets/og.png`,
        width: 1200,
        height: 630,
        alt: "Veterinary Success Network: every practice problem gets a written action plan in 2-3 business days.",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: [`${SITE}/assets/og.png`] },
};

export const viewport: Viewport = {
  themeColor: "#3BAB00",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable}`}>
        <div className="amb">
          <i></i>
          <i></i>
          <i></i>
        </div>
        <RevealObserver />
        {children}
      </body>
    </html>
  );
}
