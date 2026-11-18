"use client";

import { Fragment } from "react";
import CentreTrialWords from "@/components/centre/CentreTrialWords";
import { splitOfferText } from "@/lib/offer-wording";

/**
 * Text that may hold the centre-trial token (lib/offer-wording.ts). The token
 * becomes the day's words in the browser ("free until 31 January" before
 * 1 January 2027, "30 days free" after), so a page built in December still
 * says the right thing in January. Text without a token renders as it is.
 */
export default function OfferText({ text }: { text: string }) {
  const parts = splitOfferText(text);
  if (parts.length === 1 && parts[0].kind === "text") return <>{parts[0].text}</>;
  return (
    <>
      {parts.map((part, index) =>
        part.kind === "text" ? <Fragment key={index}>{part.text}</Fragment> : <CentreTrialWords key={index} capital={part.capital} />,
      )}
    </>
  );
}
