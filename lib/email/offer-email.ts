import { EMAIL_REPLY_TO, SITE_URL } from "@/lib/email/config";

/**
 * The "Pro free for a month" email.
 *
 * Built separately from the lifecycle layout because it carries more: the
 * wordmark, the animated note-to-story demo, four things that are new, and a
 * terms box that states the charge before the button does. The terms are not
 * small print; they are the second thing anyone reads after the headline,
 * because the fastest way to lose an educator's trust (and to earn a dispute on
 * a shared Stripe account) is a charge they did not see coming.
 *
 * Email clients vary wildly: tables for layout, inline styles for Gmail, a GIF
 * for motion (nearly every client plays one; Outlook shows its first frame,
 * which is the finished draft), a gentle CSS fade for Apple Mail only, and dark
 * mode overrides like the rest of StoryLoop's email.
 */

function esc(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export type ProMonthEmailInput = {
  name: string;
  ctaUrl: string;
  unsubscribeUrl: string;
  claimBy: string;
  firstChargeIfToday: string;
  pro: { NZD: number; AUD: number };
  educator: { NZD: number; AUD: number };
};

const NEW_THINGS = [
  {
    title: "Children, in their own words",
    body: "One big button a three-year-old can press to talk about their own work. You write down exactly what they said. StoryLoop never keeps the recording.",
  },
  {
    title: "A wall that families can read",
    body: "A small code beside a display. Families scan it at pickup and read the learning behind it, in their own language. No names or photos on the page.",
  },
  {
    title: "Pickup, before the door opens",
    body: "The specific true thing next to each child's name, taken from what you wrote down. Where nothing was recorded, it says so.",
  },
  {
    title: "Quill and term reports",
    body: "Highlight any sentence and ask Quill for it warmer or shorter, as often as you like. And a printable, score-free term summary for every child.",
  },
];

export function renderProMonthOfferEmail(input: ProMonthEmailInput) {
  const first = input.name.trim().split(/\s+/)[0] || "there";
  const subject = `${first === "there" ? "A" : `${first}, a`} month of StoryLoop Pro, on us`;
  const preview = "Unlimited stories and every new feature, free for 30 days. We remind you before anything is charged.";
  const price = `NZ$${input.pro.NZD} or A$${input.pro.AUD}`;
  const educatorPrice = `NZ$${input.educator.NZD} or A$${input.educator.AUD}`;

  const items = NEW_THINGS.map(
    (item) => `
      <tr>
        <td width="18" valign="top" style="padding:3px 12px 14px 0;"><div style="width:10px;height:10px;border-radius:999px;background:#a87851;margin-top:6px;"></div></td>
        <td valign="top" style="padding:0 0 14px;">
          <p class="sl-title" style="margin:0 0 2px;font-size:15px;font-weight:800;color:#1f1b18;">${esc(item.title)}</p>
          <p class="sl-text" style="margin:0;font-size:14px;line-height:1.6;color:#4a423d;">${esc(item.body)}</p>
        </td>
      </tr>`,
  ).join("");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>${esc(subject)}</title>
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  a { text-decoration: none; }
  @keyframes slFade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  .sl-hero { animation: slFade .7s ease-out both; }
  @media (prefers-reduced-motion: reduce) { .sl-hero { animation: none; } }
  @media (prefers-color-scheme: dark) {
    .sl-bg { background:#17130f !important; }
    .sl-card { background:#241f1b !important; border-color:#3a332c !important; }
    .sl-title { color:#f5ede3 !important; }
    .sl-text { color:#e0d6ca !important; }
    .sl-terms { background:#2c251e !important; border-color:#4a3e33 !important; }
    .sl-foot { background:#201b17 !important; border-top-color:#3a332c !important; }
    .sl-foot p { color:#a99f95 !important; }
    .sl-foot a, .sl-text a { color:#e7a976 !important; }
    .sl-btn { background:#c98a5a !important; }
    .sl-btn a { color:#1b1611 !important; }
  }
  [data-ogsc] .sl-bg { background:#17130f !important; }
  [data-ogsc] .sl-card { background:#241f1b !important; }
  [data-ogsc] .sl-title { color:#f5ede3 !important; }
  [data-ogsc] .sl-text { color:#e0d6ca !important; }
  [data-ogsc] .sl-terms { background:#2c251e !important; }
  @media only screen and (max-width:480px) {
    .sl-pad { padding:22px !important; }
    .sl-h1 { font-size:30px !important; }
  }
</style>
</head>
<body class="sl-bg" style="margin:0;background:#f8f1e7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Manrope,Arial,sans-serif;color:#24201d;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preview)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f8f1e7" class="sl-bg" style="background:#f8f1e7;padding:28px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#fffdf8" class="sl-card" style="max-width:620px;background:#fffdf8;border:1px solid #eadbcc;border-radius:28px;overflow:hidden;">
  <tr><td class="sl-pad" style="padding:30px 30px 8px;">
    <img src="${SITE_URL}/brand/storyloop-logo-email.png" width="179" height="44" alt="StoryLoop" style="display:block;width:179px;height:44px;border:0;" />
  </td></tr>
  <tr><td class="sl-pad sl-hero" style="padding:18px 30px 6px;">
    <p style="margin:0 0 8px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;font-weight:800;color:#9a6b46;">For StoryLoop educators</p>
    <h1 class="sl-title sl-h1" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:36px;line-height:1.08;color:#1f1b18;">A month of Pro, <i style="color:#8c5e3d;">on us.</i></h1>
    <p class="sl-text" style="margin:16px 0 0;font-size:16px;line-height:1.7;color:#3a332f;">Hi ${esc(first)}, StoryLoop has changed a lot since you signed up. Rather than tell you about it, I would like you to try all of it on your own notes, with no monthly cap, for a month.</p>
  </td></tr>
  <tr><td class="sl-pad" style="padding:22px 30px 6px;">
    <a href="${input.ctaUrl}"><img src="${SITE_URL}/email/note-to-story.gif" width="560" alt="A 49-word note about Mia and a slater becoming a learning story that keeps her words exactly: 'does it have a mum?' and 'it rolls into a ball like a hedgehog'." style="display:block;width:100%;max-width:560px;height:auto;border:0;border-radius:18px;" /></a>
    <p class="sl-text" style="margin:10px 0 0;font-size:12px;line-height:1.5;color:#7a706b;">A real note and the opening of the real draft StoryLoop wrote from it.</p>
  </td></tr>
  <tr><td class="sl-pad" style="padding:22px 30px 4px;">
    <p class="sl-title" style="margin:0 0 14px;font-family:Georgia,serif;font-size:21px;color:#1f1b18;">What is new since you last looked</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}</table>
  </td></tr>
  <tr><td class="sl-pad" style="padding:8px 30px 4px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="sl-terms" style="background:#fbf4ea;border:1px solid #eadbcc;border-radius:18px;">
      <tr><td style="padding:18px 20px;">
        <p class="sl-title" style="margin:0 0 8px;font-size:15px;font-weight:800;color:#1f1b18;">How the free month works</p>
        <p class="sl-text" style="margin:0 0 6px;font-size:14px;line-height:1.6;color:#3a332f;">Every Pro feature and unlimited stories, free for 30 days from the day you start. Start today and nothing is charged until <strong>${esc(input.firstChargeIfToday)}</strong>.</p>
        <p class="sl-text" style="margin:0 0 6px;font-size:14px;line-height:1.6;color:#3a332f;">Stripe saves a card so Pro carries on if you like it: then ${esc(price)} a month. Switch to Educator (${esc(educatorPrice)}) or cancel in two clicks in Billing before then and you pay nothing.</p>
        <p class="sl-text" style="margin:0;font-size:14px;line-height:1.6;color:#3a332f;">We email you 3 days before the first charge. Claim by ${esc(input.claimBy)}.</p>
      </td></tr>
    </table>
  </td></tr>
  <tr><td class="sl-pad" align="left" style="padding:24px 30px 6px;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td class="sl-btn" style="border-radius:999px;background:#6f4930;">
        <a href="${input.ctaUrl}" style="display:inline-block;padding:15px 26px;border-radius:999px;color:#fffaf1;font-size:15px;font-weight:800;">Start my free month &rarr;</a>
      </td>
    </tr></table>
  </td></tr>
  <tr><td class="sl-pad" style="padding:18px 30px 28px;">
    <p class="sl-text" style="margin:0;font-size:15px;line-height:1.7;color:#3a332f;">I build StoryLoop in Christchurch, and I read every reply. If something is missing or not right for how you work, hit reply and tell me.</p>
    <p class="sl-text" style="margin:10px 0 0;font-size:15px;line-height:1.7;color:#3a332f;">Leo<br /><span style="color:#7a706b;font-size:13px;">StoryLoop</span></p>
  </td></tr>
  <tr><td class="sl-foot sl-pad" style="padding:20px 30px;background:#fbf6ee;border-top:1px solid #efe3d7;">
    <p style="margin:0;font-size:12px;line-height:1.6;color:#6f6660;">StoryLoop by Aria Care, Christchurch, New Zealand. Stories are stored in Sydney and never used to train AI. Replies reach ${esc(EMAIL_REPLY_TO)}.</p>
    <p style="margin:10px 0 0;font-size:12px;line-height:1.6;color:#6f6660;">You are getting this because you have a StoryLoop account. <a href="${input.unsubscribeUrl}" style="color:#7a4f34;">Unsubscribe from offers and tips</a>.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    `Hi ${first},`,
    "",
    "StoryLoop has changed a lot since you signed up. Rather than tell you about it, I would like you to try all of it on your own notes, with no monthly cap, for a month.",
    "",
    "What is new since you last looked:",
    ...NEW_THINGS.map((item) => `- ${item.title}: ${item.body}`),
    "",
    "How the free month works:",
    `Every Pro feature and unlimited stories, free for 30 days from the day you start. Start today and nothing is charged until ${input.firstChargeIfToday}.`,
    `Stripe saves a card so Pro carries on if you like it: then ${price} a month. Switch to Educator (${educatorPrice}) or cancel in Billing before then and you pay nothing.`,
    `We email you 3 days before the first charge. Claim by ${input.claimBy}.`,
    "",
    `Start my free month: ${input.ctaUrl}`,
    "",
    "I build StoryLoop in Christchurch, and I read every reply.",
    "Leo, StoryLoop",
    "",
    `Unsubscribe from offers and tips: ${input.unsubscribeUrl}`,
  ].join("\n");

  return { subject, preview, html, text };
}
