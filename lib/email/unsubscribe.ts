import { createHmac, timingSafeEqual } from "crypto";

import { SITE_URL } from "./config";

type TokenPayload = {
  userId: string;
  email: string;
};

function secret() {
  return (
    process.env.EMAIL_UNSUBSCRIBE_SECRET ??
    process.env.ADMIN_SESSION_SECRET ??
    process.env.CRON_SECRET ??
    "storyloop-dev-unsubscribe"
  );
}

function sign(userId: string, email: string) {
  return createHmac("sha256", secret())
    .update(`${userId}:${email.toLowerCase()}`)
    .digest("base64url");
}

function encodeJson(value: unknown) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeJson<T>(value: string): T | null {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function createUnsubscribeToken(userId: string, email: string) {
  return encodeJson({ userId, email, signature: sign(userId, email) });
}

export function verifyUnsubscribeToken(token: string): TokenPayload | null {
  const payload = decodeJson<TokenPayload & { signature?: string }>(token);
  if (!payload?.userId || !payload.email || !payload.signature) return null;

  const expected = sign(payload.userId, payload.email);
  const actualBuffer = Buffer.from(payload.signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  return { userId: payload.userId, email: payload.email.toLowerCase() };
}

export function unsubscribeUrl(userId: string, email: string) {
  const token = createUnsubscribeToken(userId, email);
  return `${SITE_URL}/unsubscribe?token=${encodeURIComponent(token)}`;
}

// One-click endpoint used in the List-Unsubscribe header (accepts POST).
export function oneClickUnsubscribeUrl(userId: string, email: string) {
  const token = createUnsubscribeToken(userId, email);
  return `${SITE_URL}/api/unsubscribe?token=${encodeURIComponent(token)}`;
}
