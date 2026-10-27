"use client";

/**
 * The browser half of the quiet check (see lib/auth/human-pass.ts). The signup
 * page starts earning a pass when it opens, so by the time someone presses
 * "Create free account" it is usually already done. Nothing is shown to the
 * person and nothing slows them down.
 */

type Earned = { pass: string; proof: string; at: number };

const REFRESH_AFTER_MS = 100 * 60 * 1000; // passes last two hours on the server

let pending: Promise<Earned | null> | null = null;

function leadingZeroBits(bytes: Uint8Array): number {
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

async function solve(pass: string, bits: number): Promise<string | null> {
  const subtle = typeof crypto !== "undefined" ? crypto.subtle : undefined;
  if (!subtle) return null;
  const encoder = new TextEncoder();
  for (let n = 0; n < 5_000_000; n += 1) {
    const digest = new Uint8Array(await subtle.digest("SHA-256", encoder.encode(`${pass}:${n}`)));
    if (leadingZeroBits(digest) >= bits) return String(n);
  }
  return null;
}

async function earn(): Promise<Earned | null> {
  try {
    const res = await fetch("/api/auth/human-pass", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { pass?: string; bits?: number };
    if (!data.pass || typeof data.bits !== "number") return null;
    const proof = await solve(data.pass, data.bits);
    return proof ? { pass: data.pass, proof, at: Date.now() } : null;
  } catch {
    return null;
  }
}

/** Starts earning a pass in the background (call when the signup page opens). */
export function warmHumanPass() {
  if (!pending) pending = earn();
}

/**
 * The pass and proof to send with a signup. Waits for one in progress, and
 * earns a fresh one if the page has been open for hours. Never throws; null
 * means the browser could not do the check, and the server will say so kindly.
 */
export async function takeHumanPass(): Promise<{ humanPass: string; humanProof: string } | null> {
  let earned = await (pending ?? (pending = earn()));
  if (!earned || Date.now() - earned.at > REFRESH_AFTER_MS) {
    pending = earn();
    earned = await pending;
  }
  // Each pass is single use: the next attempt (after an error) earns a new one.
  pending = null;
  return earned ? { humanPass: earned.pass, humanProof: earned.proof } : null;
}
