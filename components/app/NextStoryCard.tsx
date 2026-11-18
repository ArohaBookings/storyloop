"use client";

import { ArrowRight, PenLine } from "lucide-react";
import type { NextStoryCard as Card, NextStoryChoice } from "@/lib/next-story";

/**
 * The next story, right under the first one (lib/next-story.ts). A card in the
 * story panel, never a pop-up: one tap empties the note box and puts her
 * cursor in it.
 */
export default function NextStoryCard({ card, onChoose }: { card: Card; onChoose: (choice: NextStoryChoice) => void }) {
  return (
    <section
      aria-labelledby="next-story-title"
      className="mt-4 rounded-2xl border border-sage-200 bg-sage-50 p-4 sm:p-5"
      data-testid="next-story-card"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-white text-sage-700">
          <PenLine className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 id="next-story-title" className="font-display text-base font-bold text-ink-900">{card.heading}</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-700">{card.line}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {card.options.map((option) => (
              <button
                key={option.choice}
                type="button"
                onClick={() => onChoose(option.choice)}
                className={option.primary ? "btn-primary min-h-11 px-4 text-sm" : "btn-secondary min-h-11 px-4 text-sm"}
                data-testid={`next-story-${option.choice}`}
              >
                {option.label}
                {option.primary && <ArrowRight className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
