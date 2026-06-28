"use client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

// A first story takes ~20-50s with a frontier writer. A static spinner makes that
// feel broken; stepping through what's actually happening makes the wait feel like
// progress and keeps new educators from bailing before their first "aha".
const BASE_STEPS = [
  "Reading your observation…",
  "Noticing the learning…",
  "Linking it to the curriculum…",
  "Keeping it true to your notes…",
  "Writing it in a natural educator voice…",
  "Adding next steps and a family question…",
  "Final polish…",
];

export default function GeneratingIndicator({ framework }: { framework?: "AU" | "NZ" }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStep((n) => Math.min(n + 1, BASE_STEPS.length - 1)), 6000);
    return () => clearInterval(id);
  }, []);

  const steps = [...BASE_STEPS];
  steps[2] = framework === "NZ" ? "Linking it to Te Whāriki…" : "Linking it to the EYLF…";

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <Loader2 className="w-10 h-10 animate-spin text-clay-500 mb-4" />
      <p className="font-display text-lg font-bold text-ink-900 mb-1" aria-live="polite">{steps[step]}</p>
      <p className="mt-2 text-xs text-ink-500">
        This usually takes under a minute — your evidence-led draft is worth the short wait.
      </p>
    </div>
  );
}
