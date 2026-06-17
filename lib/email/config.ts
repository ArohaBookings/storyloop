export const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "StoryLoop by Aria Care <storyloop@ariacare.app>";

export const EMAIL_REPLY_TO =
  process.env.EMAIL_REPLY_TO ?? process.env.SUPPORT_EMAIL ?? "ariacareapp@gmail.com";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://storyloop.space"
).replace(/\/$/, "");

export const ACTIVATION_OFFER_LABEL =
  process.env.STRIPE_FIRST_MONTH_COUPON_LABEL ?? "15% off your first month";
