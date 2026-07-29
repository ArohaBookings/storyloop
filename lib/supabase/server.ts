import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type SupabaseCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

// Same reasoning as the browser client: a missing env var must degrade to a
// failed auth check, not a 500 on every server-rendered page that touches it.
const PLACEHOLDER_URL = "https://unconfigured.invalid";
const PLACEHOLDER_KEY = "unconfigured";

export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    console.error("Supabase server env is missing; auth checks will fail closed.");
  }

  return createServerClient(
    url || PLACEHOLDER_URL,
    anonKey || PLACEHOLDER_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: SupabaseCookie[]) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {}
        },
      },
    }
  );
}
