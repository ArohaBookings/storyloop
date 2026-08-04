import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client.
 *
 * createBrowserClient throws when the URL or key is missing, and pages like
 * /login and /support construct it during render, so that throw became a 500
 * for the whole page rather than a failed sign-in. A missing env var must never
 * take a page down, so we fall back to an unreachable placeholder: the page
 * renders and the auth call fails through the form's normal error handling.
 *
 * This should never happen in a configured deployment, so it is logged loudly.
 */
const PLACEHOLDER_URL = "https://unconfigured.invalid";
const PLACEHOLDER_KEY = "unconfigured";

export function isSupabaseBrowserConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    console.error(
      "Supabase browser env is missing (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY). " +
      "Auth cannot work until it is set."
    );
    return createBrowserClient(PLACEHOLDER_URL, PLACEHOLDER_KEY);
  }

  return createBrowserClient(url, anonKey);
}
