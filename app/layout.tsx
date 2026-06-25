import type { Metadata } from "next";
import "./globals.css";

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
  openGraph: {
    title: "StoryLoop — Learning stories drafted faster, without losing educator voice",
    description: "Editable learning story drafts for early childhood educators, with Te Whāriki or EYLF links, dispositions, child voice, and next steps.",
    url: "https://storyloop.space/",
    siteName: "StoryLoop",
    type: "website",
    locale: "en_AU",
    images: [{ url: "/logo.svg", width: 512, height: 512, alt: "StoryLoop" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "StoryLoop — Learning Story Drafts for ECE Educators",
    description: "Turn observations into editable Te Whāriki or EYLF learning story drafts.",
    images: ["/logo.svg"],
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,400;1,9..144,600&family=Manrope:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
