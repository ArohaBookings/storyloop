import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, Manrope } from "next/font/google";
import "./globals.css";
import CookieBanner from "@/components/consent/CookieBanner";

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
    default: "StoryLoop: AI learning stories for Te Whāriki and EYLF",
    template: "%s | StoryLoop",
  },
  description: "Turn a rough note or voice memo into an editable learning story draft, with Te Whāriki or EYLF links, child voice and next steps. You edit and sign off.",
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
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/brand/favicon-96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180" }],
  },
  // A page can only appear in Google's AI Overviews or AI Mode if it is
  // eligible to be shown WITH A SNIPPET. Leaving snippet length to the default
  // is a silent cap; "max-snippet: -1" removes it. Binary payoff, so it is set
  // explicitly at both levels rather than inherited.
  robots: {
    index: true,
    follow: true,
    "max-snippet": -1,
    "max-image-preview": "large",
    "max-video-preview": -1,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
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
      // A raster logo: Google's Organization logo guidance asks for a bitmap of 112px or more.
      "logo": "https://storyloop.space/brand/storyloop-icon.png",
      "founder": { "@id": "https://storyloop.space/#leo" },
      "foundingDate": "2026",
      "foundingLocation": {
        "@type": "Place",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Christchurch",
          "addressCountry": "NZ",
        },
      },
      "areaServed": [
        { "@type": "Country", "name": "New Zealand" },
        { "@type": "Country", "name": "Australia" },
      ],
      "knowsAbout": [
        "Te Whāriki early childhood curriculum",
        "Early Years Learning Framework (EYLF)",
        "Learning stories and ECE documentation",
        "Early childhood assessment for learning",
      ],
    },
    // A named, locatable human behind the product. Answer engines weight
    // author and entity identity heavily when deciding what to cite, and a
    // one-person product can state this plainly where a platform cannot.
    {
      "@type": "Person",
      "@id": "https://storyloop.space/#leo",
      "name": "Leo",
      "givenName": "Leo",
      "jobTitle": "Founder",
      "description":
        "Founder of StoryLoop, building learning story drafting tools for early childhood educators from Christchurch, Aotearoa New Zealand.",
      "url": "https://storyloop.space/about",
      "image": "https://storyloop.space/images/leo.jpg",
      "homeLocation": {
        "@type": "Place",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Christchurch",
          "addressRegion": "Canterbury",
          "addressCountry": "NZ",
        },
      },
      "worksFor": { "@id": "https://storyloop.space/#organization" },
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      </head>
      <body className={`${fraunces.variable} ${manrope.variable} ${jetBrainsMono.variable}`}>
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
