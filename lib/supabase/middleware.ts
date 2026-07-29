import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type SupabaseCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Middleware runs on every request. If the Supabase env is not configured in
  // this environment, creating the client throws ("supabaseUrl is required")
  // and every single page 500s. A missing env var must never take down the
  // whole site: pass the request through untouched instead of crashing.
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase env missing in middleware; skipping session refresh.");
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: SupabaseCookie[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });

          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // Refresh the session cookie. If Supabase auth has a transient hiccup, never
  // let it throw out of middleware — that would break the navigation and can
  // feel like a random sign-out. The user's existing cookies stay intact.
  try {
    await supabase.auth.getUser();
  } catch (error) {
    console.error("Session refresh skipped (transient auth error):", error);
  }

  return response;
}
