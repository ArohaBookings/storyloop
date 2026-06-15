import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function verifyAdmin(): Promise<{ email: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;
  try {
    const configuredSecret = process.env.ADMIN_JWT_SECRET?.trim();
    if (!configuredSecret || configuredSecret.length < 32) return null;
    const secret = new TextEncoder().encode(configuredSecret);
    const { payload } = await jwtVerify(token, secret);
    if (payload.admin) return { email: payload.email as string };
    return null;
  } catch {
    return null;
  }
}
