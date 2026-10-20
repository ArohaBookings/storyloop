import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { VISITED_PATH_HEADER } from "@/lib/auth/visited-path";

type SupabaseCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

// The request headers server components see, plus the page that was asked
// for, so a signed-out visit can go to sign-in and come back
// (lib/auth/login-redirect.ts). Built fresh each time from request.headers so
// refreshed auth cookies are always included, and always set here so a value
// sent by the browser is overwritten.
function forwardedHeaders(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set(VISITED_PATH_HEADER, `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return headers;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: forwardedHeaders(request),
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Middleware runs on every request. If the Supabase env is not configured in
  // this environment, creating the client throws ("supabaseUrl is required")
  // and every single page 500s. A missing env var must never take down the
  // whole site: pass the request through untouched instead of crashing.
  if (!supabaseUrl || !supabaseAnonKey) {
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
              headers: forwardedHeaders(request),
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
