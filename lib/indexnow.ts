/**
 * IndexNow: tell Bing (and the engines that share its index, which several
 * AI answer engines draw on) the moment a page is new or changed, instead of
 * waiting to be recrawled.
 *
 * The key is public by design: it is served at /{key}.txt so the engines can
 * confirm the site owns the submission. Submissions only go out from the
 * production deployment, never from previews or a laptop, and a failure never
 * affects the caller.
 */

export const INDEXNOW_KEY = "aa69317f2f0f74f6969cdc879be9bf04";
export const SITE_HOST = "storyloop.space";
const SITE_URL = `https://${SITE_HOST}`;
const ENDPOINT = "https://api.indexnow.org/indexnow";
const MAX_URLS = 10_000;

/** Absolute storyloop.space URLs only, de-duplicated, capped at IndexNow's limit. */
export function indexNowPayload(paths: string[]) {
  const urlList = [
    ...new Set(
      paths
        .map((path) => {
          if (/^https?:\/\//i.test(path)) return path;
          return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
        })
        .filter((url) => {
          try {
            const parsed = new URL(url);
            return parsed.protocol === "https:" && parsed.hostname === SITE_HOST && !/\s/.test(url);
          } catch {
            return false;
          }
        }),
    ),
  ].slice(0, MAX_URLS);
  return { host: SITE_HOST, key: INDEXNOW_KEY, keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`, urlList };
}

export function shouldSubmit(env: Record<string, string | undefined> = process.env) {
  return env.VERCEL_ENV === "production";
}

export async function submitToIndexNow(
  paths: string[],
  options: { env?: Record<string, string | undefined>; fetchImpl?: typeof fetch } = {},
): Promise<{ submitted: number; status: number | null; skipped?: string }> {
  const payload = indexNowPayload(paths);
  if (!payload.urlList.length) return { submitted: 0, status: null, skipped: "no_urls" };
  if (!shouldSubmit(options.env)) return { submitted: 0, status: null, skipped: "not_production" };
  try {
    const response = await (options.fetchImpl ?? fetch)(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });
    return { submitted: payload.urlList.length, status: response.status };
  } catch (error) {
    console.error("IndexNow submission failed (nothing else affected):", error);
    return { submitted: 0, status: null, skipped: "request_failed" };
  }
}
