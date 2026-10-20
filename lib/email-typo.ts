/**
 * "Did you mean jane@gmail.com?" (21 Oct 2026). A mistyped domain silently
 * loses an account: the welcome email, sign-in links and password resets all
 * go nowhere, and the educator thinks StoryLoop is broken. Suggests a fix only
 * for the common personal and NZ/AU providers, within two typed characters.
 * Never changes the address by itself. Pure.
 */
const COMMON_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "xtra.co.nz",
  "hotmail.co.nz",
  "outlook.co.nz",
  "yahoo.co.nz",
  "bigpond.com",
  "bigpond.net.au",
  "hotmail.com.au",
  "outlook.com.au",
  "yahoo.com.au",
  "live.com.au",
  "optusnet.com.au",
  "slingshot.co.nz",
  "vodafone.co.nz",
];

function distance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = temp;
    }
  }
  return prev[b.length];
}

export function suggestEmailFix(email: string): string | null {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf("@");
  if (at < 1 || at === trimmed.length - 1) return null;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1).toLowerCase();
  if (COMMON_DOMAINS.includes(domain)) return null;
  let best: { domain: string; d: number } | null = null;
  for (const candidate of COMMON_DOMAINS) {
    const d = distance(domain, candidate);
    if (d <= 2 && (!best || d < best.d)) best = { domain: candidate, d };
  }
  // A one-letter domain difference on a short domain is too risky to suggest (e.g. me.com vs mx.com).
  if (!best || (best.domain.length <= 6 && best.d > 1)) return null;
  return `${local}@${best.domain}`;
}
