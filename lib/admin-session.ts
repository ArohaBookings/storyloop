import { SignJWT } from "jose";

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";

function getAdminSecret() {
  const value = process.env.ADMIN_JWT_SECRET?.trim();
  if (!value || value.length < 32) {
    throw new Error("ADMIN_JWT_SECRET must be configured with at least 32 characters.");
  }
  return new TextEncoder().encode(value);
}

export function isAdminEmail(email: string | null | undefined) {
  return Boolean(ADMIN_EMAIL) && typeof email === "string" && email.trim().toLowerCase() === ADMIN_EMAIL;
}

export async function createAdminSessionToken(email: string) {
  return new SignJWT({ admin: true, email })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(getAdminSecret());
}
