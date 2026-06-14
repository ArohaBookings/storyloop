"use client";

import { Check, Lightbulb } from "lucide-react";
import { getObservationReadiness } from "@/lib/observation-coach";

export default function ObservationCoach({ observation }: { observation: string }) {
  const readiness = getObservationReadiness(observation);
  const nextPrompt = readiness.signals.find((signal) => !signal.found)?.prompt;

  return (
    <div className="mt-3 rounded-2xl border border-clay-100 bg-cream-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-clay-700" />
          <p className="text-xs font-bold text-ink-800">Observation coach</p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-clay-700">
          {readiness.label} · {readiness.found}/{readiness.total}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
        {readiness.signals.map((signal) => (
          <div
            key={signal.id}
            className={`rounded-lg border px-2 py-1.5 text-[10px] font-semibold ${
              signal.found
                ? "border-sage-200 bg-sage-50 text-sage-700"
                : "border-clay-100 bg-white text-ink-500"
            }`}
          >
            <span className="flex items-center gap-1">
              {signal.found && <Check className="h-3 w-3" />}
              {signal.label}
            </span>
          </div>
        ))}
      </div>
      {observation.trim().length >= 10 && nextPrompt && (
        <p className="mt-2 text-[11px] leading-relaxed text-ink-600">
          Optional strengthening prompt: {nextPrompt}
        </p>
      )}
    </div>
  );
}
