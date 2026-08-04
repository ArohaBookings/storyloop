import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { consumeRateLimit } from "@/lib/rate-limit";

// Anonymous funnel tracking. This is deliberately minimal and privacy-safe:
// we store an ephemeral browser-generated session id, the page, the traffic
// source, and coarse device/country. No IP, no fingerprint, no personal data.
//
// It exists because without it the top of the funnel is invisible: we cannot
// tell a paid click from an organic visit, or see how many people try the demo
// and leave without signing up.

const ALLOWED_EVENTS = new Set([
  "page_view",
  "demo_started",
  "demo_completed",
  "demo_clarification",
  "demo_error",
  "demo_limit",
  "signup_view",
  "signup_submitted",
  "signup_completed",
  "cta_click",
]);

function clean(value: unknown, max = 200) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uuidOrNull(value: unknown) {
  const raw = clean(value, 60);
  return raw && UUID_PATTERN.test(raw) ? raw : null;
}

function hostOf(value: unknown) {
  const raw = clean(value, 300);
  if (!raw) return null;
  try {
    return new URL(raw).hostname.replace(/^www\./, "").slice(0, 120);
  } catch {
    return raw.replace(/^www\./, "").slice(0, 120);
  }
}

function deviceFrom(userAgent: string | null) {
  if (!userAgent) return "unknown";
  if (/iPad|Tablet/i.test(userAgent)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(userAgent)) return "mobile";
  return "desktop";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const eventType = clean(body.event, 40);
    const sessionId = clean(body.sessionId, 60);
    if (!eventType || !ALLOWED_EVENTS.has(eventType) || !sessionId) {
      // Never surface analytics problems to a visitor; just accept and drop.
      return NextResponse.json({ ok: true });
    }

    // Abuse guard. The session id comes from the browser, so limiting on it
    // alone is trivially bypassed by generating a new one per request. Limit on
    // the client IP as well, which a flooder cannot rotate as cheaply, and keep
    // the per-session limit so one tab cannot spam on a shared network.
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? request.headers.get("x-real-ip")
      ?? "unknown";
    const [sessionAllowed, ipAllowed] = await Promise.all([
      consumeRateLimit({ scope: "track", key: sessionId, limit: 60, windowSeconds: 60 * 10 }),
      consumeRateLimit({ scope: "track-ip", key: ip, limit: 600, windowSeconds: 60 * 10 }),
    ]);
    if (!sessionAllowed || !ipAllowed) return NextResponse.json({ ok: true });

    const admin = createAdminSupabase();
    await admin.from("page_events").insert({
      event_type: eventType,
      session_id: sessionId,
      // Client-supplied, so it is attribution only and never a trust signal.
      // Constrain it to a UUID so nothing arbitrary reaches the column.
      user_id: uuidOrNull(body.userId),
      path: clean(body.path, 200),
      referrer_host: hostOf(body.referrer),
      utm_source: clean(body.utmSource, 80),
      utm_medium: clean(body.utmMedium, 80),
      utm_campaign: clean(body.utmCampaign, 80),
      device: deviceFrom(request.headers.get("user-agent")),
      country: request.headers.get("x-vercel-ip-country")?.slice(0, 4) ?? null,
      metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
    });

    return NextResponse.json({ ok: true });
  } catch {
    // Analytics must never break a page or block a visitor.
    return NextResponse.json({ ok: true });
  }
}
