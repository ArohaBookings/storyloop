import { createHmac, timingSafeEqual } from "crypto";
import { SITE_URL } from "./config";

/**
 * First-party click and open tracking for marketing email (3 Nov 2026), so the
 * email brain (lib/email/brain.ts) can see what people read and click. Links
 * become https://storyloop.space/api/email/c?e=<email id>&u=<path>&s=<signature>
 * and redirect straight to the page; the signature stops anyone turning it into
 * a redirect to another site. Billing and account emails are never rewritten.
 */

function secret() {
  return process.env.EMAIL_UNSUBSCRIBE_SECRET ?? process.env.ADMIN_SESSION_SECRET ?? process.env.CRON_SECRET ?? "storyloop-dev-unsubscribe";
}

export function signLink(eventId: string, path: string) {
  return createHmac("sha256", secret()).update(`email-link|${eventId}|${path}`).digest("base64url").slice(0, 32);
}

export function verifyLink(eventId: string, path: string, signature: string) {
  const expected = Buffer.from(signLink(eventId, path));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Only a path on this site: no other host, no protocol-relative "//", no "javascript:". */
export function safePath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\s\\]/.test(value)) return null;
  return value;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isEventId = (value: string | null | undefined): value is string => Boolean(value && UUID.test(value));

/** Paths that must keep working without a redirect in between (unsubscribing is one tap). */
const UNTRACKED = /^\/(unsubscribe|api\/email\/unsubscribe)/;

export function trackedUrl(eventId: string, path: string) {
  return `${SITE_URL}/api/email/c?e=${eventId}&u=${encodeURIComponent(path)}&s=${signLink(eventId, path)}`;
}

/**
 * Rewrites every link to this site in a marketing email's HTML to its tracked
 * form and adds a 1px open marker. Links elsewhere, mailto links and
 * unsubscribe links are left exactly as they were.
 */
export function withTracking(html: string, eventId: string): string {
  const site = SITE_URL.replace(/\/$/, "");
  const rewritten = html.replace(/href="([^"]+)"/g, (whole, href: string) => {
    const decoded = href.replace(/&amp;/g, "&");
    if (!decoded.startsWith(`${site}/`)) return whole;
    const path = decoded.slice(site.length);
    if (UNTRACKED.test(path) || !safePath(path)) return whole;
    return `href="${trackedUrl(eventId, path).replace(/&/g, "&amp;")}"`;
  });
  const pixel = `<img src="${site}/api/email/o?e=${eventId}&amp;s=${signLink(eventId, "open")}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />`;
  return rewritten.includes("</body>") ? rewritten.replace("</body>", `${pixel}</body>`) : `${rewritten}${pixel}`;
}
