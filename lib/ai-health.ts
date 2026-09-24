/**
 * Why a story fell back to the basic (non-AI) writer, in words Leo can act on.
 *
 * On 24 Sept 2026 the OpenAI account ran out of credit and the backup key was
 * invalid, so every story would have silently fallen back; nothing told anyone.
 * The writer now records a reason (story_fallback events) and the admin page
 * shows this advice at the top. Pure, so it is tested (tests/ai-health.test.ts).
 */

export type AiFailureReason = "openai_no_credit" | "invalid_key" | "timeout" | "rate_limited" | "bad_output" | "no_key" | "unknown";

export function aiFailureReason(error: unknown): AiFailureReason {
  const text = error instanceof Error ? error.message : String(error ?? "");
  if (/credit_balance_exhausted|no credits remaining|insufficient_quota/i.test(text)) return "openai_no_credit";
  if (/No AI API key configured/i.test(text)) return "no_key";
  if (/\b401\b|invalid[\s_-]*(x-)?api[\s_-]*key|authentication_error|Incorrect API key/i.test(text)) return "invalid_key";
  if (/time(d)?\s?out|ETIMEDOUT|aborted|took too long|failed late/i.test(text)) return "timeout";
  if (/\b429\b|rate.?limit/i.test(text)) return "rate_limited";
  if (/JSON|Unexpected token|Unexpected end/i.test(text)) return "bad_output";
  return "unknown";
}

export const AI_FAILURE_ADVICE: Record<AiFailureReason, { title: string; fix: string; urgent: boolean }> = {
  openai_no_credit: {
    title: "OpenAI is out of credit",
    fix: "Add credit at platform.openai.com/settings/organization/billing. Stories go back to normal the moment it lands.",
    urgent: true,
  },
  invalid_key: {
    title: "An AI key was rejected",
    fix: "Check OPENAI_API_KEY and ANTHROPIC_API_KEY in Vercel, then redeploy.",
    urgent: true,
  },
  no_key: {
    title: "No AI key is set",
    fix: "Set OPENAI_API_KEY in Vercel, then redeploy.",
    urgent: true,
  },
  timeout: {
    title: "The AI took too long to answer",
    fix: "Usually a provider slowdown and clears by itself. If it keeps happening, check status.openai.com.",
    urgent: false,
  },
  rate_limited: {
    title: "The AI provider is limiting requests",
    fix: "Usually clears within minutes. If it persists, raise the usage tier on the OpenAI account.",
    urgent: false,
  },
  bad_output: {
    title: "The AI returned something unreadable",
    fix: "Occasional and harmless. Many in a row means a model or prompt problem worth a look.",
    urgent: false,
  },
  unknown: {
    title: "The AI call failed",
    fix: "Check the Vercel logs for /api/generate.",
    urgent: false,
  },
};

/** Worst reason in a set of recent fallbacks, most urgent first. */
export function summariseFallbacks(reasons: string[]) {
  const counts = new Map<AiFailureReason, number>();
  for (const raw of reasons) {
    const reason = (raw in AI_FAILURE_ADVICE ? raw : "unknown") as AiFailureReason;
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => Number(AI_FAILURE_ADVICE[b[0]].urgent) - Number(AI_FAILURE_ADVICE[a[0]].urgent) || b[1] - a[1]);
  return { total: reasons.length, top: ranked[0] ? { reason: ranked[0][0], count: ranked[0][1], ...AI_FAILURE_ADVICE[ranked[0][0]] } : null };
}
