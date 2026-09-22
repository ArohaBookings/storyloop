import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Campaign links (utm_*, fbclid, gclid and the like) used to be 308-redirected
// here to the bare URL, for tidier canonical URLs. That ran on the server,
// before the page could read them, so every tagged Facebook post, email link
// and ad arrived as "unknown": 70 of the first 89 sign-ups had no source.
// Duplicate URLs are already handled by each page's canonical tag. The page
// now records the campaign first and then removes the parameters from the
// address bar itself (lib/analytics/client.ts), so shared links stay clean.

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase();
  if (host === "www.storyloop.space") {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.protocol = "https";
    canonicalUrl.hostname = "storyloop.space";
    canonicalUrl.port = "";
    return NextResponse.redirect(canonicalUrl, 308);
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
