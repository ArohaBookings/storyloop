import type { Metadata } from "next";

// Auth pages create a Supabase browser client during render. Prerendering them
// at build time would instantiate that client with no env and throw
// ("supabaseUrl is required"), failing the whole deploy. They are interactive,
// per-user pages with no SEO value, so render them at request time instead.
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

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
