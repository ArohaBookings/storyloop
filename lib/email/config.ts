export const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "StoryLoop by Aria Care <storyloop@ariacare.app>";

export const EMAIL_REPLY_TO =
  process.env.EMAIL_REPLY_TO ?? process.env.SUPPORT_EMAIL ?? "ariacareapp@gmail.com";

const configuredSiteUrl = (
  process.env.STORYLOOP_SITE_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://storyloop.space"
).replace(/\/$/, "");

export const SITE_URL =
  configuredSiteUrl.includes("localhost") || configuredSiteUrl.endsWith(".vercel.app")
    ? "https://storyloop.space"
    : configuredSiteUrl;

export const ACTIVATION_OFFER_LABEL =
  process.env.STRIPE_FIRST_MONTH_COUPON_LABEL ?? "15% off your first month";
