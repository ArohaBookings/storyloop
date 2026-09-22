import { createHash } from "node:crypto";

/**
 * Telling Meta that an ad click became a sign-up, without putting Meta on the
 * page.
 *
 * Paid Facebook and Instagram ads cannot be judged, or optimised by Meta, if
 * Meta never hears that a click turned into a sign-up. The usual answer is the
 * Meta Pixel: a third-party script on every page, a cookie, and every visitor's
 * browsing reported whether or not they came from an ad. For a product used to
 * write about young children, that is the wrong trade.
 *
 * This is the narrow version, the Conversions API, server to server:
 *
 *   ONLY FOR AD CLICKS. An event is sent only when the person arrived through
 *   a Facebook or Instagram link, which carries a click id (fbclid). Everyone
 *   else is never mentioned to Meta at all.
 *
 *   THE MINIMUM. The click id, the browser's user-agent string (Meta requires
 *   it for website events), and a one-way hash of our internal account number
 *   so the same person is not counted twice. No email, no name, no phone, no IP
 *   address, and never anything about a child or a story.
 *
 *   OFF UNTIL SWITCHED ON. Nothing happens unless META_PIXEL_ID and
 *   META_CAPI_TOKEN are both set. META_TEST_EVENT_CODE sends to Meta's test
 *   events screen instead of live.
 *
 *   NEVER IN THE WAY. Every call is time-limited and swallows its own errors. A
 *   sign-up or a subscription can never fail because Meta was slow or down.
 *
 * Disclosed in the privacy policy, section "Who else handles information".
 */

const GRAPH_VERSION = "v21.0";
const TIMEOUT_MS = 3000;

export type MetaEventName = "CompleteRegistration" | "StartTrial";

export function metaConfigured(env: Record<string, string | undefined> = process.env) {
  return Boolean(env.META_PIXEL_ID?.trim() && env.META_CAPI_TOKEN?.trim());
}

/** A click id as Meta issues it: URL-safe characters, sensible length. */
export function isValidFbclid(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{10,500}$/.test(value);
}

/**
 * The `fbc` value Meta expects: fb.1.<ms when the click landed>.<fbclid>.
 * Returns null for anything that is not a plausible click.
 */
export function fbcFromClick(fbclid: unknown, clickedAtMs: unknown, nowMs = Date.now()): string | null {
  if (!isValidFbclid(fbclid)) return null;
  const at = typeof clickedAtMs === "number" && Number.isFinite(clickedAtMs) ? Math.round(clickedAtMs) : nowMs;
  // Meta ignores clicks older than its attribution window; so do we. A time in
  // the future is a tampered value, not a click.
  if (at > nowMs + 60_000 || nowMs - at > 90 * 86_400_000) return null;
  return `fb.1.${at}.${fbclid}`;
}

/** Accept a stored fbc only if it has the shape we write. */
export function isValidFbc(value: unknown): value is string {
  return typeof value === "string" && /^fb\.1\.\d{10,14}\.[A-Za-z0-9_-]{10,500}$/.test(value);
}

export function hashedExternalId(userId: string) {
  return createHash("sha256").update(`storyloop:${userId}`).digest("hex");
}

export type MetaEventInput = {
  eventName: MetaEventName;
  /** Stable per real-world event, so a retry is counted once. */
  eventId: string;
  userId: string;
  fbc: string;
  userAgent: string | null;
  sourceUrl: string;
  /**
   * "website" for something the person did in their browser (it then needs the
   * user-agent). "system_generated" for something Stripe told us, where there
   * is no browser to describe.
   */
  actionSource?: "website" | "system_generated";
  eventTimeSeconds?: number;
};

/** The exact payload sent. Pure, so what leaves StoryLoop is pinned by a test. */
export function buildMetaEvent(input: MetaEventInput) {
  return {
    event_name: input.eventName,
    event_time: input.eventTimeSeconds ?? Math.floor(Date.now() / 1000),
    event_id: input.eventId,
    action_source: input.actionSource ?? "website",
    event_source_url: input.sourceUrl,
    user_data: {
      fbc: input.fbc,
      external_id: [hashedExternalId(input.userId)],
      ...(input.userAgent ? { client_user_agent: input.userAgent.slice(0, 400) } : {}),
    },
  };
}

/**
 * Send one event. Resolves to what happened; never throws, never waits longer
 * than three seconds.
 */
export async function sendMetaEvent(
  input: Omit<MetaEventInput, "fbc"> & { fbc: unknown },
  env: Record<string, string | undefined> = process.env,
  fetcher: typeof fetch = fetch,
): Promise<{ sent: boolean; reason?: string }> {
  try {
    if (!metaConfigured(env)) return { sent: false, reason: "not_configured" };
    if (!isValidFbc(input.fbc)) return { sent: false, reason: "not_from_an_ad_click" };

    const body: Record<string, unknown> = { data: [buildMetaEvent({ ...input, fbc: input.fbc })] };
    const testCode = env.META_TEST_EVENT_CODE?.trim();
    if (testCode) body.test_event_code = testCode;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const url = `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(env.META_PIXEL_ID!.trim())}/events?access_token=${encodeURIComponent(env.META_CAPI_TOKEN!.trim())}`;
      const res = await fetcher(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        console.error("Meta conversion not accepted:", res.status);
        return { sent: false, reason: `http_${res.status}` };
      }
      return { sent: true };
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    console.error("Meta conversion skipped:", error instanceof Error ? error.message : error);
    return { sent: false, reason: "error" };
  }
}
