import type { Metadata } from "next";

// Admin pages are auth-gated and read live data per request. They must never be
// statically prerendered at build (which would run createAdminSupabase() with no
// env and throw). Render them at request time only.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
