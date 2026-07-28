import { ACTIVATION_OFFER_LABEL, EMAIL_REPLY_TO, SITE_URL } from "./config";
import { unsubscribeUrl } from "./unsubscribe";

export type LifecycleEmailType =
  | "welcome"
  | "no_first_story"
  | "first_story_created"
  | "two_free_stories_used"
  | "free_limit_reached"
  | "paid_no_usage_checkin"
  | "weekly_value"
  | "feedback_request"
  | "family_pack_prompt"
  | "centre_planning_prompt"
  | "story_quality_upgrade"
  // Billing + retention lifecycle. These are transactional or save-the-customer
  // moments, not marketing, and were the biggest gap in the old set: a paying
  // educator could go quiet, get charged, and cancel without hearing from us once.
  | "trial_ending"
  | "payment_succeeded"
  | "payment_failed"
  | "subscription_cancelled"
  | "winback_offer"
  | "went_quiet"
  | "referral_earned"
  | "referral_invite";

type TemplateInput = {
  type: LifecycleEmailType;
  userId: string;
  recipient: string;
  name?: string | null;
  relatedStoryId?: string | null;
  /** Optional billing/referral context. Rendering must never depend on it. */
  context?: {
    amountLabel?: string;
    planLabel?: string;
    renewsOn?: string;
    trialEndsOn?: string;
    storiesThisMonth?: number;
    hoursSaved?: number;
    referralCode?: string;
    referralsEarned?: number;
    creditLabel?: string;
    offerCode?: string;
  };
};

export type RenderedEmail = {
  emailType: LifecycleEmailType;
  subject: string;
  html: string;
  text: string;
  marketing: boolean;
  ctaUrl: string;
};

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function url(path: string, campaign: LifecycleEmailType) {
  const separator = path.includes("?") ? "&" : "?";
  return `${SITE_URL}${path}${separator}utm_source=storyloop_email&utm_medium=lifecycle&utm_campaign=${campaign}`;
}

function firstName(name?: string | null) {
  const trimmed = name?.trim();
  return trimmed ? trimmed.split(/\s+/)[0] : "there";
}

function layout({
  title,
  preview,
  body,
  cta,
  ctaUrl,
  secondary,
  unsubscribe,
}: {
  title: string;
  preview: string;
  body: string;
  cta: string;
  ctaUrl: string;
  secondary?: string;
  unsubscribe?: string;
}) {
  const footer = unsubscribe
    ? `<p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#8a817c;">You can <a href="${unsubscribe}" style="color:#7a4f34;">unsubscribe from product tips</a>. Transactional account emails may still be sent.</p>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>${esc(title)}</title>
    <style>
      :root { color-scheme: light dark; supported-color-schemes: light dark; }
      a { text-decoration: none; }
      @media (prefers-color-scheme: dark) {
        .sl-bg { background:#17130f !important; }
        .sl-card { background:#241f1b !important; border-color:#3a332c !important; box-shadow:none !important; }
        .sl-header { background:#2a231e !important; border-bottom-color:#3a332c !important; }
        .sl-eyebrow { color:#dcab80 !important; }
        .sl-title { color:#f5ede3 !important; }
        .sl-body, .sl-body > p:not(.sl-callout) { color:#e7ded3 !important; }
        .sl-body a { color:#e7a976 !important; }
        .sl-callout { background:#2c251e !important; color:#f0e7dc !important; }
        .sl-callout strong { color:#f7efe4 !important; }
        .sl-footer { background:#201b17 !important; border-top-color:#3a332c !important; }
        .sl-footer p, .sl-footer { color:#a99f95 !important; }
        .sl-footer a { color:#e7a976 !important; }
        .sl-btn { background:#b3774c !important; }
        .sl-btn a { color:#1b1611 !important; }
      }
      /* Outlook (windows/web/mobile) signals dark mode with these attributes
         rather than prefers-color-scheme, so the same overrides are repeated. */
      [data-ogsc] .sl-bg { background:#17130f !important; }
      [data-ogsc] .sl-card { background:#241f1b !important; border-color:#3a332c !important; }
      [data-ogsc] .sl-header { background:#2a231e !important; }
      [data-ogsc] .sl-eyebrow { color:#dcab80 !important; }
      [data-ogsc] .sl-title { color:#f5ede3 !important; }
      [data-ogsc] .sl-body, [data-ogsc] .sl-body p { color:#e7ded3 !important; }
      [data-ogsc] .sl-body a { color:#e7a976 !important; }
      [data-ogsc] .sl-footer, [data-ogsc] .sl-footer p { color:#a99f95 !important; }
      [data-ogsc] .sl-footer a { color:#e7a976 !important; }
      @media only screen and (max-width:480px) {
        .sl-pad { padding:22px !important; }
        .sl-title { font-size:24px !important; }
      }
    </style>
  </head>
  <body class="sl-bg" style="margin:0;background:#f8f1e7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,Manrope,Arial,sans-serif;color:#24201d;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preview)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f8f1e7" class="sl-bg" style="background:#f8f1e7;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#fffdf8" class="sl-card" style="max-width:640px;background:#fffdf8;border:1px solid #eadbcc;border-radius:28px;overflow:hidden;box-shadow:0 18px 45px rgba(64,43,31,.08);">
            <tr>
              <td class="sl-header sl-pad" style="padding:28px 28px 18px;border-bottom:1px solid #efe3d7;background:linear-gradient(135deg,#fffaf1,#f4eadf);">
                <p class="sl-eyebrow" style="margin:0 0 6px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;font-weight:800;color:#9a6b46;">StoryLoop</p>
                <h1 class="sl-title" style="margin:0;font-family:Georgia,serif;font-size:30px;line-height:1.1;color:#1f1b18;">${esc(title)}</h1>
              </td>
            </tr>
            <tr>
              <td class="sl-pad" style="padding:28px;">
                <div class="sl-body" style="font-size:15px;line-height:1.72;color:#3a332f;">${body}</div>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                  <tr>
                    <td class="sl-btn" style="border-radius:999px;background:#7a4f34;">
                      <a href="${ctaUrl}" style="display:inline-block;padding:13px 22px;border-radius:999px;color:#fffaf1;text-decoration:none;font-size:14px;font-weight:800;">${esc(cta)}</a>
                    </td>
                  </tr>
                </table>
                <div class="sl-body">${secondary ?? ""}</div>
              </td>
            </tr>
            <tr>
              <td class="sl-footer sl-pad" style="padding:22px 28px;background:#fbf6ee;border-top:1px solid #efe3d7;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#6f6660;">StoryLoop by Aria Care. Reply to this email and it will reach ${esc(EMAIL_REPLY_TO)}.</p>
                ${footer}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function plain({
  title,
  lines,
  cta,
  ctaUrl,
  unsubscribe,
}: {
  title: string;
  lines: string[];
  cta: string;
  ctaUrl: string;
  unsubscribe?: string;
}) {
  return [
    title,
    "",
    ...lines,
    "",
    `${cta}: ${ctaUrl}`,
    "",
    `Reply to ${EMAIL_REPLY_TO}.`,
    unsubscribe ? `Unsubscribe from product tips: ${unsubscribe}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function renderLifecycleEmail(input: TemplateInput): RenderedEmail {
  const name = firstName(input.name);
  const unsubscribe = unsubscribeUrl(input.userId, input.recipient);
  const ctx = input.context ?? {};

  const templates: Record<LifecycleEmailType, () => RenderedEmail> = {
    welcome: () => {
      const ctaUrl = url("/generate", "welcome");
      const subject = "Welcome to StoryLoop — create your first story";
      const lines = [
        `Hi ${name}, thanks for joining StoryLoop.`,
        "The fastest way to test it is simple: paste 3-5 rough bullet points or record a quick voice note from one real observation.",
        "You have 3 free stories to try this month.",
      ];
      return {
        emailType: "welcome",
        subject,
        marketing: false,
        ctaUrl,
        html: layout({
          title: "Create your first StoryLoop story",
          preview: "Paste a few rough notes or record a voice note.",
          cta: "Create your first story",
          ctaUrl,
          body: `<p>Hi ${esc(name)}, thanks for joining StoryLoop.</p><p>The fastest way to test it is simple: <strong>paste 3-5 rough bullet points</strong> or record a quick voice note from one real observation.</p><p>You have <strong>3 free stories</strong> to try this month.</p>`,
        }),
        text: plain({ title: subject, lines, cta: "Create your first story", ctaUrl }),
      };
    },
    no_first_story: () => {
      const ctaUrl = url("/generate?welcome=1", "no_first_story");
      const subject = "Need help creating your first StoryLoop story?";
      const sample =
        "Lily built a tall block tower beside Amara. When it fell twice, she paused, moved the wider blocks to the bottom, and asked Amara to hold the base. When it stayed upright, Lily smiled and said, \"It stayed!\"";
      const lines = [
        "The easiest way to test StoryLoop is with one real observation.",
        `Try this style of input: "${sample}"`,
        "Paste something similar and StoryLoop will shape the first draft.",
      ];
      return {
        emailType: "no_first_story",
        subject,
        marketing: true,
        ctaUrl,
        html: layout({
          title: "Try one real observation",
          preview: "A quick example you can paste into StoryLoop.",
          cta: "Try your first story",
          ctaUrl,
          unsubscribe,
          body: `<p>The easiest way to test StoryLoop is with one real observation.</p><div style="margin:18px 0;padding:16px;border-left:4px solid #a87851;background:#fff8eb;border-radius:14px;color:#3a332f;">${esc(sample)}</div><p>Paste something similar and StoryLoop will shape the first draft.</p>`,
        }),
        text: plain({ title: subject, lines, cta: "Try your first story", ctaUrl, unsubscribe }),
      };
    },
    first_story_created: () => {
      const ctaUrl = url("/generate", "first_story_created");
      const feedbackUrl = url("/feedback?category=story_quality", "first_story_created");
      const subject = "How did your first StoryLoop story feel?";
      const feedbackButtons = `<p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#6f6660;">Was the draft useful, nearly there, or off? <a href="${feedbackUrl}" style="color:#7a4f34;font-weight:800;">Send one line of feedback</a>.</p>`;
      const lines = [
        "You created your first StoryLoop draft.",
        "Did it sound like something you would actually edit/use, or did anything feel off?",
        `Send feedback: ${feedbackUrl}`,
        "Or create another story while the workflow is fresh.",
      ];
      return {
        emailType: "first_story_created",
        subject,
        marketing: false,
        ctaUrl,
        html: layout({
          title: "How did that first draft feel?",
          preview: "One quick feedback question.",
          cta: "Create another story",
          ctaUrl,
          secondary: feedbackButtons,
          body: `<p>You created your first StoryLoop draft.</p><p><strong>Did it sound like something you would actually edit/use, or did anything feel off?</strong></p><p>Reply with one line, or create another story while the workflow is fresh.</p>`,
        }),
        text: plain({ title: subject, lines, cta: "Create another story", ctaUrl }),
      };
    },
    two_free_stories_used: () => {
      const ctaUrl = url("/billing?offer=activation", "two_free_stories_used");
      const finalStoryUrl = url("/generate", "two_free_stories_used");
      const subject = "One free StoryLoop story left";
      const lines = [
        "You've turned two quick observations into learning stories that are ready to share — that's the slow part of the week mostly handled.",
        "You have one free story left this month. Educator unlocks unlimited stories so documentation stops being the thing you dread. Educator Pro adds family messages, translation, and a learning thread for each child.",
        `As an early educator, your first month is ${ACTIVATION_OFFER_LABEL} through this link.`,
        `Or create your final free story first: ${finalStoryUrl}`,
      ];
      return {
        emailType: "two_free_stories_used",
        subject,
        marketing: true,
        ctaUrl,
        html: layout({
          title: "You have 1 free story left",
          preview: `A quiet ${ACTIVATION_OFFER_LABEL} offer if StoryLoop is helping.`,
          cta: `Upgrade — ${ACTIVATION_OFFER_LABEL}`,
          ctaUrl,
          unsubscribe,
          secondary: `<p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#6f6660;">Not ready yet? <a href="${finalStoryUrl}" style="color:#7a4f34;font-weight:800;">Create your final free story first</a>.</p>`,
          body: `<p>You've turned two quick observations into learning stories that are ready to share — that's <strong>the slow part of the week mostly handled</strong>.</p><p>You have <strong>one free story left</strong> this month. <strong>Educator</strong> unlocks unlimited stories so documentation stops being the thing you dread. <strong>Educator Pro</strong> adds family messages, translation, and a learning thread for each child.</p><p class="sl-callout" style="padding:12px 14px;border-radius:14px;background:#f2efe5;color:#51453d;"><strong>Early-educator offer:</strong> ${esc(ACTIVATION_OFFER_LABEL)}.</p>`,
        }),
        text: plain({ title: subject, lines, cta: `Use ${ACTIVATION_OFFER_LABEL}`, ctaUrl, unsubscribe }),
      };
    },
    free_limit_reached: () => {
      const ctaUrl = url("/billing?offer=activation", "free_limit_reached");
      const subject = "Your free stories are used — keep the time back";
      const lines = [
        "You've used your 3 free StoryLoop stories this month. If each one saved you even fifteen minutes, that's your documentation backlog starting to clear.",
        "Upgrade for unlimited stories that sound like you wrote them, with Te Whāriki and EYLF links, child voice, dispositions, and practical next steps built in.",
        `As an early educator, you get ${ACTIVATION_OFFER_LABEL}.`,
      ];
      return {
        emailType: "free_limit_reached",
        subject,
        marketing: true,
        ctaUrl,
        html: layout({
          title: "Keep the time back",
          preview: "Your 3 free stories are used this month — upgrade for unlimited.",
          cta: `Upgrade — ${ACTIVATION_OFFER_LABEL}`,
          ctaUrl,
          unsubscribe,
          body: `<p>You've used your <strong>3 free StoryLoop stories</strong> this month. If each one saved you even fifteen minutes, that's your <strong>documentation backlog starting to clear</strong>.</p><p>Upgrade for unlimited stories that sound like you wrote them — with Te Whāriki and EYLF links, child voice, dispositions, and practical next steps built in.</p><p class="sl-callout" style="padding:12px 14px;border-radius:14px;background:#f2efe5;color:#51453d;"><strong>Early-educator offer:</strong> ${esc(ACTIVATION_OFFER_LABEL)}.</p>`,
        }),
        text: plain({ title: subject, lines, cta: "Upgrade StoryLoop", ctaUrl, unsubscribe }),
      };
    },
    paid_no_usage_checkin: () => {
      const ctaUrl = url("/generate", "paid_no_usage_checkin");
      const subject = "Quick check-in from StoryLoop";
      const lines = [
        "Just checking in to see how you are finding StoryLoop so far.",
        "The quickest test is still one real observation: paste it in, generate a draft, then edit the parts that need your voice.",
        "If anything feels confusing or missing, reply and tell me.",
      ];
      return {
        emailType: "paid_no_usage_checkin",
        subject,
        marketing: false,
        ctaUrl,
        html: layout({
          title: "Quick StoryLoop check-in",
          preview: "A short note to help you get value from your plan.",
          cta: "Create a story",
          ctaUrl,
          body: `<p>Just checking in to see how you are finding StoryLoop so far.</p><p>The quickest test is still one real observation: paste it in, generate a draft, then edit the parts that need your voice.</p><p>If anything feels confusing or missing, reply and tell me.</p>`,
        }),
        text: plain({ title: subject, lines, cta: "Create a story", ctaUrl }),
      };
    },
    weekly_value: () => {
      const ctaUrl = url("/generate", "weekly_value");
      const subject = "One observation you could turn into a story this week";
      const sample =
        "During water play, a child tested which cups sank or floated, then changed their plan and explained the idea to another child.";
      const lines = [
        "This week's quick StoryLoop prompt:",
        sample,
        "Paste one moment like this, choose EYLF or Te Whāriki, and let StoryLoop give you a draft to edit.",
      ];
      return {
        emailType: "weekly_value",
        subject,
        marketing: true,
        ctaUrl,
        html: layout({
          title: "A quick story idea for this week",
          preview: "One observation prompt you can use now.",
          cta: "Create a story",
          ctaUrl,
          unsubscribe,
          body: `<p>This week's quick StoryLoop prompt:</p><div style="margin:18px 0;padding:16px;border-left:4px solid #5c7e3d;background:#f2f6ec;border-radius:14px;color:#3a332f;">${esc(sample)}</div><p>Paste one moment like this, choose EYLF or Te Whāriki, and let StoryLoop give you a draft to edit.</p>`,
        }),
        text: plain({ title: subject, lines, cta: "Create a story", ctaUrl, unsubscribe }),
      };
    },
    feedback_request: () => {
      const ctaUrl = url("/feedback?category=feature_request", "feedback_request");
      const subject = "What would make StoryLoop worth keeping?";
      const lines = [
        "You have used StoryLoop enough to know what helps and what still gets in the way.",
        "Tell us the exact thing that would save you the most time: story quality, family communication, backlog, planning, mobile flow, billing, or something else.",
        "We read every reply ourselves, and it shapes what we build next.",
      ];
      return {
        emailType: "feedback_request",
        subject,
        marketing: true,
        ctaUrl,
        html: layout({
          title: "What should StoryLoop fix next?",
          preview: "We read every reply ourselves.",
          cta: "Send feedback",
          ctaUrl,
          unsubscribe,
          body: `<p>You have used StoryLoop enough to know what helps and what still gets in the way.</p><p>Tell us the exact thing that would save you the most time: story quality, family communication, backlog, planning, mobile flow, billing, or something else.</p><p>We read every reply ourselves, and it shapes what we build next.</p>`,
        }),
        text: plain({ title: subject, lines, cta: "Send feedback", ctaUrl, unsubscribe }),
      };
    },
    family_pack_prompt: () => {
      const ctaUrl = url("/generate", "family_pack_prompt");
      const subject = "A faster way to turn a story into a family message";
      const lines = [
        "A common time sink is rewriting an educator story so families can quickly understand it.",
        "StoryLoop now gives paid educators a Family Connection Pack: a shorter message, family question, home link, photo caption, and handover note from the saved story.",
        "Create or open a story, then use Family Pack beside the draft.",
      ];
      return {
        emailType: "family_pack_prompt",
        subject,
        marketing: true,
        ctaUrl,
        html: layout({
          title: "Family messages without rewriting the whole story",
          preview: "Use a saved story to create a family-ready pack.",
          cta: "Create a story",
          ctaUrl,
          unsubscribe,
          body: `<p>A common time sink is rewriting an educator story so families can quickly understand it.</p><p>StoryLoop now gives paid educators a <strong>Family Connection Pack</strong>: a shorter message, family question, home link, photo caption, and handover note from the saved story.</p><p>Create or open a story, then use Family Pack beside the draft.</p>`,
        }),
        text: plain({ title: subject, lines, cta: "Create a story", ctaUrl, unsubscribe }),
      };
    },
    centre_planning_prompt: () => {
      const ctaUrl = url("/planning", "centre_planning_prompt");
      const subject = "Turn recent stories into a room planning brief";
      const lines = [
        "Centre plans now include Room Planning Briefs.",
        "StoryLoop reviews recent story evidence and suggests emerging interests, environment ideas, intentional teaching moves, family partnership prompts, and team reflection questions.",
        "It is built for weekly planning conversations, not extra paperwork.",
      ];
      return {
        emailType: "centre_planning_prompt",
        subject,
        marketing: true,
        ctaUrl,
        html: layout({
          title: "A planning brief from the stories already written",
          preview: "Use recent learning stories to support the next team conversation.",
          cta: "Open planning brief",
          ctaUrl,
          unsubscribe,
          body: `<p>Centre plans now include <strong>Room Planning Briefs</strong>.</p><p>StoryLoop reviews recent story evidence and suggests emerging interests, environment ideas, intentional teaching moves, family partnership prompts, and team reflection questions.</p><p>It is built for weekly planning conversations, not extra paperwork.</p>`,
        }),
        text: plain({ title: subject, lines, cta: "Open planning brief", ctaUrl, unsubscribe }),
      };
    },
    story_quality_upgrade: () => {
      const ctaUrl = url("/generate", "story_quality_upgrade");
      const subject = "We just made your StoryLoop learning stories noticeably better";
      const lines = [
        `Hi ${name}, a short and honest note.`,
        "You were one of the first educators to use StoryLoop, and some of your early drafts came out flatter and more generic than the moment you actually described. That is on us, not on your observations.",
        "We have rebuilt the part of StoryLoop that writes your stories. Drafts now read like a thoughtful educator wrote them: they tidy your rough notes into real prose, stay specific to the child in front of you, and respect the tone and depth you choose.",
        "If you have a spare minute, open one of your observations and generate it again. We think you will see the difference straight away.",
        "Thank you for giving StoryLoop an early go. Reply any time and it reaches a real person.",
      ];
      return {
        emailType: "story_quality_upgrade",
        subject,
        // Service notice about the educator's own stories — not a promotion.
        marketing: false,
        ctaUrl,
        html: layout({
          title: "Your learning stories just got a serious upgrade",
          preview: "We rebuilt the StoryLoop writer — your stories now read like a real educator wrote them.",
          cta: "See the difference",
          ctaUrl,
          secondary: `<p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#6f6660;">Nothing you saved was changed or deleted. This only affects new stories you generate from here.</p>`,
          body: `<p>Hi ${esc(name)}, a short and honest note.</p><p>You were one of the first educators to use StoryLoop, and some of your early drafts came out <strong>flatter and more generic</strong> than the moment you actually described. That is on us, not on your observations.</p><p>We have rebuilt the part of StoryLoop that writes your stories. Drafts now read like a thoughtful educator wrote them: they <strong>tidy your rough notes into real prose</strong>, stay <strong>specific to the child</strong> in front of you, and respect the tone and depth you choose.</p><p>If you have a spare minute, open one of your observations and generate it again — we think you will see the difference straight away.</p><p>Thank you for giving StoryLoop an early go.</p>`,
        }),
        text: plain({ title: subject, lines, cta: "See the difference", ctaUrl }),
      };
    },

    // ---------------------------------------------------------------------
    // Billing + retention lifecycle
    // ---------------------------------------------------------------------

    // Sent BEFORE the first charge. Being surprised by a payment is one of the
    // fastest ways to lose trust, and a silent charge is a cancellation waiting
    // to happen.
    trial_ending: () => {
      const ctaUrl = url("/billing", "trial_ending");
      const plan = ctx.planLabel ?? "your plan";
      const amount = ctx.amountLabel ?? "your plan price";
      const when = ctx.trialEndsOn ?? "in 2 days";
      const subject = `Your StoryLoop trial ends ${when}`;
      const lines = [
        `Hi ${name}, a quick heads-up so nothing is a surprise.`,
        `Your free trial of ${plan} ends ${when}, and your first payment of ${amount} will be taken then.`,
        "If StoryLoop is not right for you, you can cancel in one click before then and you will not be charged.",
      ];
      return {
        emailType: "trial_ending",
        subject,
        marketing: false,
        ctaUrl,
        html: layout({
          title: `Your trial ends ${esc(when)}`,
          preview: `First payment of ${esc(amount)} — cancel any time before then.`,
          cta: "Manage billing",
          ctaUrl,
          secondary: `<p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#6f6660;">No action needed if you want to keep going. Everything you have written stays yours either way.</p>`,
          body: `<p>Hi ${esc(name)}, a quick heads-up so nothing is a surprise.</p><p>Your free trial of <strong>${esc(plan)}</strong> ends <strong>${esc(when)}</strong>, and your first payment of <strong>${esc(amount)}</strong> will be taken then.</p><p>If StoryLoop is not right for you, you can cancel in one click before then and you will not be charged a cent.</p>`,
        }),
        text: plain({ title: subject, lines, cta: "Manage billing", ctaUrl }),
      };
    },

    // Receipt + genuine thank you. Reinforces the value they just paid for.
    payment_succeeded: () => {
      const ctaUrl = url("/generate", "payment_succeeded");
      const amount = ctx.amountLabel ?? "your subscription";
      const plan = ctx.planLabel ?? "StoryLoop";
      const renews = ctx.renewsOn;
      const stories = ctx.storiesThisMonth;
      const subject = "Thank you for using StoryLoop";
      const lines = [
        `Hi ${name}, your payment of ${amount} for ${plan} went through.`,
        stories ? `You wrote ${stories} learning stories this month.` : "Your unlimited stories are ready whenever you are.",
        renews ? `Your next payment is ${renews}.` : "",
        "Thank you for backing a small New Zealand product.",
      ].filter(Boolean);
      return {
        emailType: "payment_succeeded",
        subject,
        marketing: false,
        ctaUrl,
        html: layout({
          title: "Thank you for using StoryLoop",
          preview: `Payment received for ${esc(plan)}.`,
          cta: "Write a story",
          ctaUrl,
          secondary: renews
            ? `<p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#6f6660;">Next payment: ${esc(renews)}. You can view invoices or cancel any time from Billing.</p>`
            : undefined,
          body: `<p>Hi ${esc(name)}, your payment of <strong>${esc(amount)}</strong> for ${esc(plan)} went through.</p>${
            stories
              ? `<p>You turned <strong>${stories} observations</strong> into finished learning stories this month. That is real evenings back.</p>`
              : `<p>Your stories are ready whenever you are.</p>`
          }<p>Thank you for backing a small New Zealand product. If anything is getting in your way, just reply to this email — it comes straight to us.</p>`,
        }),
        text: plain({ title: subject, lines, cta: "Write a story", ctaUrl }),
      };
    },

    // A failed card is silent churn if nobody tells them.
    payment_failed: () => {
      const ctaUrl = url("/billing", "payment_failed");
      const subject = "Your StoryLoop payment did not go through";
      const lines = [
        `Hi ${name}, your latest StoryLoop payment could not be processed.`,
        "This is almost always an expired card or a bank block, not a problem with your account.",
        "Updating your card takes about thirty seconds and everything carries on as normal.",
        "Your stories are safe and nothing has been deleted.",
      ];
      return {
        emailType: "payment_failed",
        subject,
        marketing: false,
        ctaUrl,
        html: layout({
          title: "Your payment did not go through",
          preview: "Usually an expired card. Takes 30 seconds to fix.",
          cta: "Update payment method",
          ctaUrl,
          secondary: `<p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#6f6660;">Your stories are safe. Nothing has been deleted and nothing will be.</p>`,
          body: `<p>Hi ${esc(name)}, your latest StoryLoop payment could not be processed.</p><p>This is almost always an <strong>expired card or a bank block</strong>, not a problem with your account. Updating your card takes about thirty seconds and everything carries on as normal.</p><p>If you would rather stop instead, that is completely fine — no need to reply, it will simply lapse.</p>`,
        }),
        text: plain({ title: subject, lines, cta: "Update payment method", ctaUrl }),
      };
    },

    // Cancellation confirmation that offers PAUSE rather than begging. Educator
    // demand is seasonal: holidays and cleared backlogs are the real reason
    // people leave, and pausing fits that far better than a discount.
    subscription_cancelled: () => {
      const ctaUrl = url("/billing", "subscription_cancelled");
      const subject = "Your StoryLoop subscription is cancelled";
      const lines = [
        `Hi ${name}, your StoryLoop subscription is now cancelled and you will not be charged again.`,
        "Everything you have written is still in your account, and it stays there.",
        "If you were stopping because it is the holidays or your documentation is caught up, you can pause instead of cancelling and pick it back up next term.",
        "If something about StoryLoop got in your way, just reply and tell us. We read every one.",
      ];
      return {
        emailType: "subscription_cancelled",
        subject,
        marketing: false,
        ctaUrl,
        html: layout({
          title: "Your subscription is cancelled",
          preview: "Your stories stay yours. Pause is an option if you are coming back.",
          cta: "Pause instead of cancelling",
          ctaUrl,
          secondary: `<p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#6f6660;">Not coming back? No hard feelings at all. Thank you for giving StoryLoop a go.</p>`,
          body: `<p>Hi ${esc(name)}, your StoryLoop subscription is cancelled and you will not be charged again.</p><p><strong>Everything you have written is still in your account</strong>, and it stays there.</p><p>One thing worth knowing: most educators who leave are not unhappy, they are just caught up or heading into the holidays. If that is you, you can <strong>pause instead</strong> and pick it back up next term without losing anything.</p><p>And if something genuinely got in your way, reply to this email and tell us. We read every single one.</p>`,
        }),
        text: plain({ title: subject, lines, cta: "Pause instead of cancelling", ctaUrl }),
      };
    },

    // Sent a while AFTER cancelling, when the next term's documentation load is
    // starting to bite. A discount only works once the need has come back.
    winback_offer: () => {
      const ctaUrl = url("/billing", "winback_offer");
      const code = ctx.offerCode;
      const subject = `${name}, come back for 20% off`;
      const lines = [
        `Hi ${name}, StoryLoop has moved on a lot since you left.`,
        "Stories are sharper, they keep the child's own words, and there is now an assistant that rewrites any line you highlight.",
        code ? `If you want another go, ${code} takes 20% off your next month.` : "If you want another go, there is 20% off your next month waiting.",
        "No pressure either way.",
      ];
      return {
        emailType: "winback_offer",
        subject,
        marketing: true,
        ctaUrl,
        html: layout({
          title: "Come back for 20% off",
          preview: "StoryLoop has changed a lot since you left.",
          cta: "Restart with 20% off",
          ctaUrl,
          unsubscribe,
          secondary: code
            ? `<p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#6f6660;">Use code <strong>${esc(code)}</strong> at checkout.</p>`
            : undefined,
          body: `<p>Hi ${esc(name)}, StoryLoop has moved on a lot since you left.</p><p>Stories are <strong>sharper and more specific</strong>, they keep <strong>the child's own words</strong> exactly as you wrote them, and there is now an assistant that rewrites any line you highlight without touching the rest.</p><p>If the documentation is piling up again, there is <strong>20% off your next month</strong> waiting. Your old stories are all still there.</p><p>No pressure either way — and thank you for having given it a go.</p>`,
        }),
        text: plain({ title: subject, lines, cta: "Restart with 20% off", ctaUrl, unsubscribe }),
      };
    },

    // The email that would have saved Samantha: heavy use, then silence.
    went_quiet: () => {
      const ctaUrl = url("/generate", "went_quiet");
      const stories = ctx.storiesThisMonth;
      const subject = "Still there?";
      const lines = [
        `Hi ${name}, you were writing a lot of stories and then it went quiet.`,
        "That usually means one of two things: you are caught up, or something got in the way.",
        "If you are caught up, brilliant. If something got in the way, reply and tell us what it was.",
      ];
      return {
        emailType: "went_quiet",
        subject,
        marketing: true,
        ctaUrl,
        html: layout({
          title: "Still there?",
          preview: "You were flying, then it went quiet.",
          cta: "Write one story",
          ctaUrl,
          unsubscribe,
          secondary: `<p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#6f6660;">If you are just between terms, you can pause your plan from Billing rather than cancelling.</p>`,
          body: `<p>Hi ${esc(name)},</p>${
            stories
              ? `<p>You wrote <strong>${stories} learning stories</strong> and then it went quiet.</p>`
              : `<p>You were writing regularly, and then it went quiet.</p>`
          }<p>In our experience that means one of two things: you are <strong>caught up</strong> (in which case, brilliant, that was the point) or <strong>something got in the way</strong>.</p><p>If it is the second one, hit reply and tell us what it was. It goes straight to us and it genuinely changes what we build.</p>`,
        }),
        text: plain({ title: subject, lines, cta: "Write one story", ctaUrl, unsubscribe }),
      };
    },

    // ---------------------------------------------------------------------
    // Referral
    // ---------------------------------------------------------------------

    referral_earned: () => {
      const ctaUrl = url("/billing", "referral_earned");
      const credit = ctx.creditLabel ?? "a free month";
      const earned = ctx.referralsEarned ?? 1;
      const remaining = Math.max(0, 5 - earned);
      const subject = `You just earned ${credit}`;
      const lines = [
        `Hi ${name}, someone you referred just became a paying StoryLoop member.`,
        `${credit} has been credited to your account automatically — it comes off your next invoice.`,
        remaining > 0 ? `You can earn ${remaining} more free ${remaining === 1 ? "month" : "months"}.` : "That is all five free months earned. Thank you.",
      ];
      return {
        emailType: "referral_earned",
        subject,
        marketing: false,
        ctaUrl,
        html: layout({
          title: `You earned ${esc(credit)}`,
          preview: "Someone you referred just subscribed.",
          cta: "See your credit",
          ctaUrl,
          secondary: remaining > 0
            ? `<p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#6f6660;">You can earn up to 5 free months in total. ${remaining} to go.</p>`
            : undefined,
          body: `<p>Hi ${esc(name)}, someone you referred just became a paying StoryLoop member.</p><p><strong>${esc(credit)}</strong> has been credited to your account automatically. It comes straight off your next invoice, nothing for you to do.</p><p>Thank you for telling another educator about us. It genuinely matters at our size.</p>`,
        }),
        text: plain({ title: subject, lines, cta: "See your credit", ctaUrl }),
      };
    },

    referral_invite: () => {
      const ctaUrl = url("/support", "referral_invite");
      const code = ctx.referralCode;
      const subject = "Give an educator 10% off, get a free month";
      const lines = [
        `Hi ${name}, if StoryLoop is saving you time, there is a good chance someone in your team could use it too.`,
        code ? `Your code is ${code}.` : "Your referral code is in the app.",
        "They get 10% off their first month. You get a free month once they subscribe, up to five.",
      ];
      return {
        emailType: "referral_invite",
        subject,
        marketing: true,
        ctaUrl,
        html: layout({
          title: "Give 10% off, get a free month",
          preview: "Share StoryLoop with another educator.",
          cta: "Get your referral link",
          ctaUrl,
          unsubscribe,
          secondary: code
            ? `<p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#6f6660;">Your code: <strong>${esc(code)}</strong></p>`
            : undefined,
          body: `<p>Hi ${esc(name)}, if StoryLoop is saving you time, chances are someone in your team or centre could use it too.</p><p>Share your code and <strong>they get 10% off their first month</strong>. Once they subscribe, <strong>you get a whole month free</strong>, up to five months in total.</p><p>No catch, and nothing to claim. The credit lands on your account by itself.</p>`,
        }),
        text: plain({ title: subject, lines, cta: "Get your referral link", ctaUrl, unsubscribe }),
      };
    },
  };

  return templates[input.type]();
}
