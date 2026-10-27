import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * The quiet check (27 Oct 2026). Leo: bot protection "without the bullshit
 * where people have to answer are you a bot".
 *
 * Nobody sees a puzzle. While a person fills in the signup form, their browser
 * quietly earns a pass:
 *   1. The signup page fetches a pass this server signed (time + random nonce
 *      + HMAC). A script posting straight to /api/auth/signup has none.
 *   2. The browser finds a number that makes sha256(pass:number) start with
 *      DIFFICULTY_BITS zero bits: about 4,000 tries, a fraction of a second on
 *      a phone, unnoticeable for one person and real work for a bot making
 *      thousands of accounts.
 *   3. Each pass works once (the signup route records the nonce) and expires
 *      after two hours.
 * A hidden field people never see, and a list of throwaway email domains,
 * catch the rest (see lib/auth/disposable-email.ts and the signup route).
 *
 * Why it exists: Aria Care, which shares StoryLoop's email account and sending
 * domain, was flooded in October 2026 by bots creating accounts with other
 * people's addresses, and every one triggered a welcome email.
 */

export const DIFFICULTY_BITS = 12;
export const PASS_MAX_AGE_MS = 2 * 60 * 60 * 1000;

function secret(): Buffer {
  const base = process.env.HUMAN_PASS_SECRET?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.ADMIN_JWT_SECRET?.trim();
  if (!base) throw new Error("No secret configured for the signup check.");
  return createHash("sha256").update(`storyloop-human-pass:${base}`).digest();
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function issuePass(now: number = Date.now()): { pass: string; bits: number } {
  const nonce = randomBytes(12).toString("base64url");
  const payload = `${now}.${nonce}`;
  return { pass: `${payload}.${sign(payload)}`, bits: DIFFICULTY_BITS };
}

/** Leading zero bits of a byte array. Pure. */
export function leadingZeroBits(bytes: Uint8Array): number {
  let bits = 0;
  for (const byte of bytes) {
    if (byte === 0) {
      bits += 8;
      continue;
    }
    for (let mask = 0x80; mask > 0 && (byte & mask) === 0; mask >>= 1) bits += 1;
    break;
  }
  return bits;
}

export function proofBits(pass: string, proof: string | number): number {
  return leadingZeroBits(createHash("sha256").update(`${pass}:${proof}`).digest());
}

export type PassCheck =
  | { ok: true; nonce: string }
  | { ok: false; reason: "missing" | "malformed" | "bad_signature" | "expired" | "future" | "weak_proof" };

export function verifyPass(pass: unknown, proof: unknown, now: number = Date.now(), bits: number = DIFFICULTY_BITS): PassCheck {
  if (typeof pass !== "string" || !pass || (typeof proof !== "string" && typeof proof !== "number")) return { ok: false, reason: "missing" };
  if (pass.length > 200 || String(proof).length > 20 || !/^\d+$/.test(String(proof))) return { ok: false, reason: "malformed" };
  const parts = pass.split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed" };
  const [issued, nonce, signature] = parts;
  if (!/^\d{12,14}$/.test(issued) || !/^[A-Za-z0-9_-]{8,40}$/.test(nonce)) return { ok: false, reason: "malformed" };
  const expected = Buffer.from(sign(`${issued}.${nonce}`));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, reason: "bad_signature" };
  const age = now - Number(issued);
  if (age < -60_000) return { ok: false, reason: "future" };
  if (age > PASS_MAX_AGE_MS) return { ok: false, reason: "expired" };
  if (proofBits(pass, String(proof)) < bits) return { ok: false, reason: "weak_proof" };
  return { ok: true, nonce };
}

/** Finds a proof on the server side. Used by tests; browsers use lib/auth/human-pass-client.ts. */
export function solvePass(pass: string, bits: number = DIFFICULTY_BITS): string {
  for (let n = 0; n < 50_000_000; n += 1) {
    if (proofBits(pass, n) >= bits) return String(n);
  }
  throw new Error("No proof found");
}
