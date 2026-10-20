"use client";

import { useEffect } from "react";
import Script from "next/script";
import { CONSENT_CHANGED, currentConsent, type ConsentChoice } from "@/lib/analytics/consent";
import { GOOGLE_ADS_ID, updateAdsConsent } from "@/lib/analytics/google-ads";

/**
 * The Google tag, for Google Ads conversion measurement only (see
 * lib/analytics/google-ads.ts). Rendered by the root layout on the production
 * deployment only, so local runs, previews and the test suite never load it.
 *
 * Consent mode defaults are set before the tag loads, by the same rule as the
 * rest of the site (lib/analytics/consent-region.ts): the visitor's own answer
 * first; else Global Privacy Control means denied; else granted outside the
 * EU, EEA, UK and Switzerland (no banner there) and denied inside them until
 * "Allow". Ad personalisation is always denied. url_passthrough carries
 * Google's click id from the landing page to the signup page without a cookie.
 */
export default function GoogleAdsTag() {
  useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<ConsentChoice>).detail ?? currentConsent();
      updateAdsConsent(detail ?? null);
    };
    window.addEventListener(CONSENT_CHANGED, onChange);
    return () => window.removeEventListener(CONSENT_CHANGED, onChange);
  }, []);

  return (
    <>
      <Script id="google-ads-consent" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
var slChoice = (document.cookie.match(/(?:^|;\\s*)sl_consent=(all|essential)(?:;|$)/) || [])[1];
var slOpen = /(?:^|;\\s*)sl_region=open(?:;|$)/.test(document.cookie);
var slAllowed = slChoice ? slChoice === 'all' : (navigator.globalPrivacyControl !== true && slOpen);
gtag('consent', 'default', {
  ad_storage: slAllowed ? 'granted' : 'denied',
  ad_user_data: slAllowed ? 'granted' : 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied'
});
gtag('set', 'url_passthrough', true);
gtag('js', new Date());
gtag('config', '${GOOGLE_ADS_ID}', { allow_ad_personalization_signals: false });`}
      </Script>
      <Script id="google-ads-tag" src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`} strategy="afterInteractive" />
    </>
  );
}
