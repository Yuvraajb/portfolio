import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Telemetry } from "@/components/telemetry";
import getMetadata from "./lib/metadata";
import CONFIG from "./lib/config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});
// Only used for long-form bodies (post pages, about), never above the fold —
// so keep it off the critical path rather than preloading it on every route.
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata = getMetadata();

/** Person schema, so search engines resolve the site to a real identity. */
const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: CONFIG.NAME,
  url: CONFIG.SITE_URL,
  jobTitle: "Software Engineer",
  description: CONFIG.TAGLINE,
  alumniOf: {
    "@type": "CollegeOrUniversity",
    name: "Santa Clara University",
  },
  sameAs: [
    "https://github.com/Yuvraajb",
    "https://www.linkedin.com/in/yuvraajbhatter/",
    "https://x.com/bhatteryuvraaj",
    "https://substack.com/@yuvraajb/posts",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      // Font variables on <html> so `@theme inline`'s literal family names
      // resolve everywhere, including portals.
      className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} h-full`}
    >
      <head>
        <script
          type="application/ld+json"
          // Static, authored object — not user input.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
      </head>
      <body className="flex min-h-full flex-col overflow-x-clip">
        {children}
        <Telemetry />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
