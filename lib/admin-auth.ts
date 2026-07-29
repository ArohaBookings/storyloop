import { cookies } from "next/headers";
import { jwtVerify } from "jose";

async function verifyToken(token: string) {
  const configuredSecret = process.env.ADMIN_JWT_SECRET?.trim();
  if (!configuredSecret || configuredSecret.length < 32) return null;
  const secret = new TextEncoder().encode(configuredSecret);
  const { payload } = await jwtVerify(token, secret);
  if (payload.admin && typeof payload.email === "string") return { email: payload.email };
  return null;
}

export async function verifyAdmin(): Promise<{ email: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;
  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}

/** Accept the same short-lived signed admin session as a Bearer token for the
 * read-only MCP endpoint. The signing secret itself is never accepted. */
export async function verifyAdminBearerToken(token: string) {
  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}
