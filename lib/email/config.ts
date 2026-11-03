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

// From the same constants as the coupon checkout applies (lib/activation-offer.ts),
// so the wording can never drift from the discount. It used to be an env setting.
export { ACTIVATION_OFFER_LABEL } from "../activation-offer";
