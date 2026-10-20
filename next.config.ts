import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  reactStrictMode: true,
  poweredByHeader: false,
  // Links in the 29 Sep 2026 Facebook posts lost the space after them, so the
  // next word became part of the address and the page was a 404 (found 19 Oct
  // 2026). These five are redirected here, cleanly; any other address that is
  // a real page plus stray text is caught in app/[slug] (lib/mangled-paths.ts).
  async redirects() {
    return [
      { source: "/examplesIf", destination: "/examples", permanent: true },
      { source: "/ai-tools-for-learning-storiesFull", destination: "/ai-tools-for-learning-stories", permanent: true },
      { source: "/learning-story-templateStoryLoop", destination: "/learning-story-template", permanent: true },
      { source: "/observation-methods-early-childhoodThere:rest(.*)", destination: "/observation-methods-early-childhood", permanent: true },
      { source: "/ero-early-childhood-regulation-2026Disclosure", destination: "/ero-early-childhood-regulation-2026", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), payment=(self), microphone=(self)" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://checkout.stripe.com" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
