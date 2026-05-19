import { SignJWT } from "jose";

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "leoanthonybons@gmail.com";

export function isAdminEmail(email: string | null | undefined) {
  return typeof email === "string" && email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

export async function createAdminSessionToken(email: string) {
  const secret = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET ?? "fallback-change-me");

  return new SignJWT({ admin: true, email })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(secret);
}
