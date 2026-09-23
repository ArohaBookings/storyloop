"use client";

import { useMemo, useState } from "react";
import { Check, HelpCircle, PenLine } from "lucide-react";
import DraftStory from "@/components/examples/DraftStory";
import type { RealExample } from "@/lib/real-examples";
import { track } from "@/lib/analytics/client";

const AGES = ["All ages", "Under 1", "1 to 2 years", "2 to 3 years", "3 to 4 years", "4 to 5 years"];
const PLACES = [
  { key: "all", label: "Both countries" },
  { key: "NZ", label: "Aotearoa, Te Whāriki" },
  { key: "AU", label: "Australia, EYLF" },
];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
        active ? "border-clay-700 bg-clay-700 text-paper" : "border-clay-200 bg-paper text-ink-700 hover:border-clay-400"
      }`}
    >
      {children}
    </button>
  );
}

export default function ExamplesBrowser({ examples }: { examples: RealExample[] }) {
  const [age, setAge] = useState("All ages");
  const [place, setPlace] = useState("all");
  const shown = useMemo(
    () => examples.filter((e) => (age === "All ages" || e.age === age) && (place === "all" || e.framework === place)),
    [examples, age, place],
  );

  return (
    <div>
      <div className="sticky top-16 z-20 -mx-4 border-y border-clay-100 bg-paper/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by age">
          {AGES.map((label) => (
            <Chip key={label} active={age === label} onClick={() => { setAge(label); track("click", { name: "examples_filter_age", value: label }); }}>
              {label}
            </Chip>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by country">
          {PLACES.map((item) => (
            <Chip key={item.key} active={place === item.key} onClick={() => { setPlace(item.key); track("click", { name: "examples_filter_place", value: item.key }); }}>
              {item.label}
            </Chip>
          ))}
          <span className="ml-auto text-sm text-ink-500" aria-live="polite">{shown.length} of {examples.length}</span>
        </div>
      </div>

      <div className="mt-10 space-y-16">
        {shown.map((example) => (
          <article key={example.slug} id={example.slug} className="scroll-mt-40">
            <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="font-display text-2xl font-bold text-ink-900 md:text-3xl">{example.title}</h2>
              <p className="text-sm text-ink-500">
                {example.childName ? `${example.childName}, ` : ""}
                {example.age.toLowerCase()} · {example.setting} · {example.framework === "NZ" ? "Te Whāriki" : "EYLF V2.0"}
              </p>
            </div>
            <div className="grid min-w-0 gap-5 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="min-w-0 space-y-4 lg:sticky lg:top-44 lg:self-start">
                <div className="card bg-cream-50 p-6">
                  <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-clay-700">
                    <PenLine className="h-4 w-4" /> What the educator wrote, {example.note.split(/\s+/).length} words
                  </p>
                  <p className="font-mono text-sm leading-relaxed text-ink-700">{example.note}</p>
                </div>
                {example.fromNote.length > 0 && (
                  <div className="rounded-2xl border border-sage-200 bg-sage-50/70 p-5">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-sage-700">What the draft rests on</p>
                    <ul className="space-y-1.5 text-sm leading-relaxed text-ink-700">
                      {example.fromNote.map((item) => (
                        <li key={item} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 flex-none text-sage-600" />{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {example.toCheck.length > 0 && (
                  <div className="rounded-2xl border border-clay-200 bg-paper p-5">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-clay-700">Flagged for the educator to check</p>
                    <ul className="space-y-1.5 text-sm leading-relaxed text-ink-700">
                      {example.toCheck.map((item) => (
                        <li key={item} className="flex gap-2"><HelpCircle className="mt-0.5 h-4 w-4 flex-none text-clay-600" />{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="card min-w-0 border-l-4 border-clay-500 p-6 md:p-8">
                <p className="mb-4 text-xs font-bold uppercase tracking-wider text-sage-700">
                  The draft StoryLoop wrote, {example.words} words, unedited
                </p>
                <DraftStory story={example.story} note={example.note} showTitle={false} />
              </div>
            </div>
          </article>
        ))}
        {shown.length === 0 && (
          <p className="rounded-2xl border border-clay-100 bg-cream-50 p-6 text-base text-ink-600">
            No example for that mix yet. Try another age, or both countries.
          </p>
        )}
      </div>
    </div>
  );
}
