import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { SEO_PAGE_SLUGS } from "@/lib/seo-pages";

const PUBLIC_CANONICAL_PATHS = new Set([
  "/",
  "/about",
  "/resources",
  "/privacy",
  "/terms",
  "/nz-learning-stories",
  "/australia-eylf-learning-stories",
  "/learning-story-generator",
  "/te-whariki-learning-stories",
  "/eylf-learning-stories",
  "/pricing",
  "/examples",
  "/faq",
  ...SEO_PAGE_SLUGS.map((slug) => `/${slug}`),
]);

const TRACKING_PARAMS = [
  "fbclid",
  "gclid",
  "gbraid",
  "wbraid",
  "mc_cid",
  "mc_eid",
  "msclkid",
];

function hasTrackingQuery(searchParams: URLSearchParams) {
  for (const key of searchParams.keys()) {
    if (key.startsWith("utm_") || TRACKING_PARAMS.includes(key)) return true;
  }

  return false;
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase();
  if (host === "www.storyloop.space") {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.protocol = "https";
    canonicalUrl.hostname = "storyloop.space";
    canonicalUrl.port = "";
    return NextResponse.redirect(canonicalUrl, 308);
  }

  if (
    (request.method === "GET" || request.method === "HEAD") &&
    request.nextUrl.search &&
    PUBLIC_CANONICAL_PATHS.has(request.nextUrl.pathname) &&
    hasTrackingQuery(request.nextUrl.searchParams)
  ) {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.search = "";
    return NextResponse.redirect(canonicalUrl, 308);
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
