import { ACTIVATION_OFFER_LABEL, EMAIL_REPLY_TO, SITE_URL } from "./config";
import { unsubscribeUrl } from "./unsubscribe";

export type LifecycleEmailType =
  | "welcome"
  | "no_first_story"
  | "first_story_created"
  | "two_free_stories_used"
  | "free_limit_reached"
  | "paid_no_usage_checkin"
  | "weekly_value";

type TemplateInput = {
  type: LifecycleEmailType;
  userId: string;
  recipient: string;
  name?: string | null;
  relatedStoryId?: string | null;
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
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>${esc(title)}</title>
  </head>
  <body style="margin:0;background:#f8f1e7;font-family:Inter,Manrope,Arial,sans-serif;color:#24201d;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preview)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f1e7;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#fffdf8;border:1px solid #eadbcc;border-radius:28px;overflow:hidden;box-shadow:0 18px 45px rgba(64,43,31,.08);">
            <tr>
              <td style="padding:28px 28px 18px;border-bottom:1px solid #efe3d7;background:linear-gradient(135deg,#fffaf1,#f4eadf);">
                <p style="margin:0 0 6px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;font-weight:800;color:#9a6b46;">StoryLoop</p>
                <h1 style="margin:0;font-family:Georgia,serif;font-size:30px;line-height:1.1;color:#1f1b18;">${esc(title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <div style="font-size:15px;line-height:1.72;color:#3a332f;">${body}</div>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                  <tr>
                    <td style="border-radius:999px;background:#7a4f34;">
                      <a href="${ctaUrl}" style="display:inline-block;padding:13px 20px;border-radius:999px;color:#fffaf1;text-decoration:none;font-size:14px;font-weight:800;">${esc(cta)}</a>
                    </td>
                  </tr>
                </table>
                ${secondary ?? ""}
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px;background:#fbf6ee;border-top:1px solid #efe3d7;">
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
      const ctaUrl = url("/generate", "no_first_story");
      const subject = "Need help creating your first StoryLoop story?";
      const sample =
        "Today Lily spent time building a tower with blocks. She kept trying after it fell. She asked another child to help and smiled when it stood up.";
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
      const subject = "How did your first StoryLoop story feel?";
      const useful = `mailto:${EMAIL_REPLY_TO}?subject=StoryLoop%20feedback%20-%20Useful&body=Useful`;
      const sortOf = `mailto:${EMAIL_REPLY_TO}?subject=StoryLoop%20feedback%20-%20Sort%20of&body=Sort%20of`;
      const notUseful = `mailto:${EMAIL_REPLY_TO}?subject=StoryLoop%20feedback%20-%20Not%20useful&body=Not%20useful`;
      const feedbackButtons = `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:18px;"><tr><td><a href="${useful}" style="display:inline-block;margin:0 8px 8px 0;padding:9px 12px;border:1px solid #d7c3b1;border-radius:999px;color:#7a4f34;text-decoration:none;font-size:13px;font-weight:700;">Useful</a></td><td><a href="${sortOf}" style="display:inline-block;margin:0 8px 8px 0;padding:9px 12px;border:1px solid #d7c3b1;border-radius:999px;color:#7a4f34;text-decoration:none;font-size:13px;font-weight:700;">Sort of</a></td><td><a href="${notUseful}" style="display:inline-block;margin:0 0 8px 0;padding:9px 12px;border:1px solid #d7c3b1;border-radius:999px;color:#7a4f34;text-decoration:none;font-size:13px;font-weight:700;">Not useful</a></td></tr></table>`;
      const lines = [
        "You created your first StoryLoop draft.",
        "Did it sound like something you would actually edit/use, or did anything feel off?",
        "Reply with one line, or create another story while the workflow is fresh.",
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
      const subject = "You’ve got 1 free StoryLoop story left";
      const lines = [
        "You have 1 free StoryLoop story left this month.",
        "If it is saving you time, upgrading keeps you turning observations into editable drafts without starting from a blank page.",
        `Your activation offer is ${ACTIVATION_OFFER_LABEL} when you upgrade through this link.`,
        `Create your final free story: ${finalStoryUrl}`,
      ];
      return {
        emailType: "two_free_stories_used",
        subject,
        marketing: true,
        ctaUrl,
        html: layout({
          title: "You have 1 free story left",
          preview: `A quiet ${ACTIVATION_OFFER_LABEL} offer if StoryLoop is helping.`,
          cta: `Use ${ACTIVATION_OFFER_LABEL}`,
          ctaUrl,
          unsubscribe,
          secondary: `<p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#6f6660;">Not ready yet? <a href="${finalStoryUrl}" style="color:#7a4f34;font-weight:800;">Create your final free story</a>.</p>`,
          body: `<p>You have <strong>1 free StoryLoop story left</strong> this month.</p><p>If it is saving you time, upgrading keeps you turning observations into editable drafts without starting from a blank page.</p><p style="padding:12px 14px;border-radius:14px;background:#f2efe5;color:#51453d;"><strong>Activation offer:</strong> ${esc(ACTIVATION_OFFER_LABEL)}.</p>`,
        }),
        text: plain({ title: subject, lines, cta: `Use ${ACTIVATION_OFFER_LABEL}`, ctaUrl, unsubscribe }),
      };
    },
    free_limit_reached: () => {
      const ctaUrl = url("/billing?offer=activation", "free_limit_reached");
      const subject = "Keep using StoryLoop for your learning stories";
      const lines = [
        "Your 3 free StoryLoop stories are used for this month.",
        "Upgrade when you are ready for more stories each month, saved history, editable drafts, Te Whāriki/EYLF support, child voice, dispositions, and next steps.",
        `Your activation offer is ${ACTIVATION_OFFER_LABEL} for the first month.`,
      ];
      return {
        emailType: "free_limit_reached",
        subject,
        marketing: true,
        ctaUrl,
        html: layout({
          title: "Keep using StoryLoop",
          preview: "Your 3 free stories are used this month.",
          cta: "Upgrade StoryLoop",
          ctaUrl,
          unsubscribe,
          body: `<p>Your <strong>3 free StoryLoop stories</strong> are used for this month.</p><p>Upgrade when you are ready for more stories each month, saved history, editable drafts, Te Whāriki/EYLF support, child voice, dispositions, and next steps.</p><p style="padding:12px 14px;border-radius:14px;background:#f2efe5;color:#51453d;"><strong>Activation offer:</strong> ${esc(ACTIVATION_OFFER_LABEL)} for the first month.</p>`,
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
  };

  return templates[input.type]();
}
