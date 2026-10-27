/**
 * Throwaway inboxes (27 Oct 2026). Accounts on them are almost always bots or
 * people who will never see a receipt or a password reset. The list is small on
 * purpose: only services that exist to give out disposable addresses, never a
 * normal provider (gmail, outlook, xtra, bigpond and the like are fine).
 */
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "guerrillamail.org", "sharklasers.com", "grr.la",
  "10minutemail.com", "10minutemail.net", "temp-mail.org", "tempmail.com", "tempmail.net", "temp-mail.io",
  "tempmailo.com", "tempail.com", "yopmail.com", "yopmail.net", "yopmail.fr", "trashmail.com", "trashmail.de",
  "getnada.com", "nada.email", "dispostable.com", "maildrop.cc", "mailnesia.com", "mintemail.com",
  "throwawaymail.com", "fakeinbox.com", "emailondeck.com", "mohmal.com", "moakt.com", "mailcatch.com",
  "spamgourmet.com", "burnermail.io", "inboxkitten.com", "1secmail.com", "1secmail.net", "1secmail.org",
  "emailfake.com", "fakemail.net", "mail.tm", "mailpoof.com", "tmpmail.org", "tmpmail.net", "dropmail.me",
  "harakirimail.com", "spambox.us", "trbvm.com", "necub.com", "dmxs8.com", "rteet.com", "kzccv.com",
  "qzueos.com", "wuuvo.com", "fexpost.com", "fexbox.org", "mailbox.in.ua", "byom.de", "cyclelove.cc",
]);

export function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at === -1 ? "" : email.slice(at + 1).trim().toLowerCase();
}

/** True for a throwaway inbox, including its subdomains. Pure. */
export function isDisposableEmail(email: string): boolean {
  const domain = emailDomain(email);
  if (!domain) return false;
  if (DISPOSABLE_DOMAINS.has(domain)) return true;
  for (const blocked of DISPOSABLE_DOMAINS) {
    if (domain.endsWith(`.${blocked}`)) return true;
  }
  return false;
}

export const DISPOSABLE_EMAIL_MESSAGE =
  "Please use the email address you check every day. Temporary inboxes can't receive your stories, receipts or password resets.";
