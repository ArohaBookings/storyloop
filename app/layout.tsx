import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, Manrope } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-fraunces",
});

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://storyloop.space"),
  title: {
    default: "StoryLoop — Learning Stories Drafted Faster, Without Losing Educator Voice",
    template: "%s | StoryLoop",
  },
  description: "Turn real observations, voice notes, or bullet points into editable early childhood learning story drafts with Te Whāriki or EYLF links, dispositions, child voice, and practical next steps.",
  keywords: [
    "learning story generator",
    "ECE documentation tool",
    "early childhood learning stories",
    "Te Whāriki learning stories NZ",
    "EYLF learning stories Australia",
    "learning story AI assistant",
    "educator documentation tool",
    "voice note to learning story",
    "early childhood teacher documentation",
    "ECE family communication",
    "early childhood planning brief",
    "learning story quality check",
  ],
  authors: [{ name: "StoryLoop by Aria Care" }],
  creator: "StoryLoop by Aria Care",
  publisher: "StoryLoop by Aria Care",
  category: "Early childhood education software",
  openGraph: {
    title: "StoryLoop — Learning stories drafted faster, without losing educator voice",
    description: "Editable learning story drafts for early childhood educators, with Te Whāriki or EYLF links, dispositions, child voice, and next steps.",
    url: "https://storyloop.space/",
    siteName: "StoryLoop",
    type: "website",
    locale: "en_AU",
    images: [{ url: "/images/hero.jpg", width: 1800, height: 1200, alt: "Early childhood educator in a prepared classroom" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "StoryLoop — Learning Story Drafts for ECE Educators",
    description: "Turn observations into editable Te Whāriki or EYLF learning story drafts.",
    images: ["/images/hero.jpg"],
  },
  icons: { icon: "/favicon.svg" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://storyloop.space/#organization",
      "name": "StoryLoop by Aria Care",
      "url": "https://storyloop.space/",
      "email": "ariacareapp@gmail.com",
      "logo": "https://storyloop.space/logo.svg",
    },
    {
      "@type": "WebSite",
      "@id": "https://storyloop.space/#website",
      "name": "StoryLoop",
      "url": "https://storyloop.space/",
      "publisher": { "@id": "https://storyloop.space/#organization" },
      "inLanguage": "en-AU",
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://storyloop.space/#software",
      "name": "StoryLoop",
      "description": "Learning story drafting assistant for early childhood educators using Te Whāriki and EYLF-aligned curriculum links, child continuity, whānau voice, and educator review.",
      "applicationCategory": "EducationalApplication",
      "operatingSystem": "Web",
      "url": "https://storyloop.space/",
      "publisher": { "@id": "https://storyloop.space/#organization" },
      "featureList": [
        "Voice notes to editable learning stories",
        "Today Loop for quick moments and daily follow-up focus",
        "EYLF and Te Whāriki curriculum links",
        "Child learning continuity profiles",
        "Curriculum compass for reflection",
        "Whānau voice capture",
        "Educator evidence and privacy review",
        "Family Connection Pack for parent communication",
        "Backlog Rescue for rough observations",
        "Room Planning Briefs for centre teams",
        "Feedback inbox and admin insight dashboard",
      ],
      "offers": [
        { "@type": "Offer", "price": "0", "priceCurrency": "AUD", "name": "Free plan" },
        { "@type": "Offer", "price": "19", "priceCurrency": "AUD", "name": "Educator plan" },
        { "@type": "Offer", "price": "29", "priceCurrency": "AUD", "name": "Educator Pro plan" },
        { "@type": "Offer", "price": "99", "priceCurrency": "AUD", "name": "Centre Starter plan" },
        { "@type": "Offer", "price": "199", "priceCurrency": "AUD", "name": "Centre Growth plan" },
      ],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      </head>
      <body className={`${fraunces.variable} ${manrope.variable} ${jetBrainsMono.variable}`}>{children}</body>
    </html>
  );
}
