import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { REGION_COOKIE, regionForCountry } from "@/lib/analytics/consent-region";

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

  const response = await updateSession(request);
  // Whether this visitor is asked about cookies (lib/analytics/consent-region.ts).
  // Vercel sets the country; without it (local runs, tests) the answer is "ask".
  const region = regionForCountry(request.headers.get("x-vercel-ip-country"));
  if (request.cookies.get(REGION_COOKIE)?.value !== region) {
    response.cookies.set(REGION_COOKIE, region, {
      path: "/",
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
