import { redirectToLogin } from "@/lib/auth/login-redirect";
import { createClient } from "@/lib/supabase/server";
import StatementFromNotes from "@/components/app/StatementFromNotes";

export const metadata = { title: "Statement or summary from your notes" };

/**
 * A transition statement or end-of-year summary from pasted notes
 * (lib/statement-from-notes.ts). The page only checks who is signed in; the
 * drafting, the allowance and the counting are in the route.
 */
export default async function StatementPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirectToLogin();

  return (
    <div className="w-full max-w-none p-4 sm:p-6 md:p-8" data-testid="statement-page">
      <h1 className="font-display text-3xl font-bold text-ink-900">Statement or summary, from your notes</h1>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-600">
        Paste what you know about one child. You get it back outcome by outcome: what your notes show, and a strategy or next step for
        each. It writes only from your notes and leaves an outcome for you when they show nothing.
      </p>
      <StatementFromNotes />
    </div>
  );
}
