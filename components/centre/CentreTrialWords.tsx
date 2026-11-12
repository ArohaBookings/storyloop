"use client";

import { useEffect, useState } from "react";
import { centreTrialWords, centreTrialWordsCapital } from "@/lib/centre-offer";

/**
 * How long a centre that starts now is free: "free until 31 January" before
 * 1 January 2027 (New Zealand time), "30 days free" after (lib/centre-offer.ts).
 *
 * Worked out again in the browser after the page loads, because several pages
 * that show it are built ahead of time: a page built in December must not keep
 * saying "until 31 January" in January. `initial` is what the server rendered,
 * so the first paint and hydration agree.
 */
export default function CentreTrialWords({ initial, capital = false }: { initial?: string; capital?: boolean }) {
  const words = useCentreTrialWords(initial, capital);
  return <span data-testid="centre-trial-words">{words}</span>;
}

export function useCentreTrialWords(initial?: string, capital = false) {
  const pick = (at: Date) => (capital ? centreTrialWordsCapital(at) : centreTrialWords(at));
  const [words, setWords] = useState(() => initial ?? pick(new Date()));
  useEffect(() => {
    setWords(pick(new Date()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capital]);
  return words;
}
