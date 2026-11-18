import LoginForm from "./LoginForm";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { isAppDestination } from "@/lib/signup-next";

/**
 * Sign in. Read on the server so the first frame already says the right
 * thing: a signed-out visit to a page of the app (/statement, /today...)
 * arrives here with ?redirect=, and someone new must see the way to a free
 * account as clearly as the way to sign in (19 Nov 2026: "Welcome back"
 * and a small "Create an account" link that dropped the page was a dead end
 * for a new educator).
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const raw = typeof params.redirect === "string" ? params.redirect : null;
  const redirect = raw ? safeRedirectPath(raw) : null;
  return <LoginForm initialRedirect={redirect} offerSignup={isAppDestination(redirect)} />;
}
