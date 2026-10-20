"use client";

import { useEffect } from "react";
import Script from "next/script";
import { CONSENT_CHANGED, readConsent, type ConsentChoice } from "@/lib/analytics/consent";
import { GOOGLE_ADS_ID, updateAdsConsent } from "@/lib/analytics/google-ads";

/**
 * The Google tag, for Google Ads conversion measurement only (see
 * lib/analytics/google-ads.ts). Rendered by the root layout on the production
 * deployment only, so local runs, previews and the test suite never load it.
 *
 * Consent mode defaults are set before the tag loads: everything denied unless
 * this browser already chose "Allow". url_passthrough carries Google's click id
 * from the landing page to the signup page without a cookie.
 */
export default function GoogleAdsTag() {
  useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<ConsentChoice>).detail ?? readConsent();
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
var slAllowed = /(?:^|;\\s*)sl_consent=all(?:;|$)/.test(document.cookie);
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
