import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Funnel events recorded by the server, where the browser cannot be trusted
 * to report them or never gets the chance: checkout opened, checkout finished,
 * a payment failing. Same table as the anonymous page events, so one query
 * follows a visitor from the first page to a paid plan.
 *
 * `sessionId` is the browser's analytics session when the request carried it,
 * which is what joins a server event to the pages before it. Without it the
 * event is keyed to the account instead. Never throws: a lost analytics row
 * must not cost anyone a checkout.
 */
export async function recordServerEvent(
  admin: SupabaseClient,
  input: {
    event: string;
    userId?: string | null;
    sessionId?: string | null;
    path?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  try {
    const metadata = Object.fromEntries(Object.entries(input.metadata ?? {}).filter(([, value]) => value !== undefined));
    await admin.from("page_events").insert({
      event_type: input.event.slice(0, 40),
      session_id: (input.sessionId || (input.userId ? `user:${input.userId}` : "server")).slice(0, 60),
      user_id: input.userId ?? null,
      path: input.path?.slice(0, 200) ?? null,
      device: "server",
      metadata: { ...metadata, source: "server" },
    });
  } catch (error) {
    console.error("Server analytics event dropped:", error);
  }
}
