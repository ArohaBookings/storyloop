import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function verifyAdmin(): Promise<{ email: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET ?? "fallback-change-me");
    const { payload } = await jwtVerify(token, secret);
    if (payload.admin) return { email: payload.email as string };
    return null;
  } catch {
    return null;
  }
}
