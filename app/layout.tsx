import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://storyloop.app"),
  title: {
    default: "StoryLoop — AI Learning Stories for Educators in 30 Seconds",
    template: "%s | StoryLoop",
  },
  description: "Turn 3 bullet points into a beautifully written learning story that meets EYLF standards. Trusted by educators across Australia and New Zealand. Free to try — no credit card required.",
  keywords: ["learning story", "learning stories childcare", "EYLF learning story examples", "early childhood documentation", "NQF documentation", "childcare learning story template", "learning story generator"],
  authors: [{ name: "StoryLoop by Aria Care" }],
  openGraph: {
    title: "StoryLoop — Write Learning Stories in 30 Seconds",
    description: "AI-powered learning story generator for early childhood educators. EYLF-aligned. Built in Australia.",
    url: "https://storyloop.app",
    siteName: "StoryLoop",
    type: "website",
    locale: "en_AU",
  },
  twitter: {
    card: "summary_large_image",
    title: "StoryLoop — AI Learning Stories",
    description: "Turn observations into EYLF-aligned learning stories in seconds.",
  },
  icons: { icon: "/favicon.svg" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "StoryLoop",
  "description": "AI learning story generator for early childhood educators. EYLF-aligned documentation in seconds.",
  "applicationCategory": "EducationalApplication",
  "operatingSystem": "Web",
  "offers": [
    { "@type": "Offer", "price": "0", "priceCurrency": "AUD", "name": "Free plan" },
    { "@type": "Offer", "price": "19", "priceCurrency": "AUD", "name": "Educator plan" },
    { "@type": "Offer", "price": "49", "priceCurrency": "AUD", "name": "Centre plan" },
  ],
  "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.9", "reviewCount": "47" },
  "publisher": { "@type": "Organization", "name": "Aria Care", "url": "https://aria.care" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,400;1,9..144,600&family=Manrope:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
