"use client";

import { useMemo, useState } from "react";
import StoryText from "@/components/app/StoryText";
import { LEADER_SOURCES_ON } from "@/lib/build-switches";
import { matchSources, noteUnits, type SourceResult, type SourceSentence } from "@/lib/source-lines";

/**
 * Where each line came from: a story or statement shown beside the note it
 * was written from (25 Nov 2026, A4, switch LEADER_SOURCES_ON).
 *
 * Each sentence of the observation carries the number of the note line it
 * came from (tap it to read that line), or a soft "not in the note". The
 * educator's reading (learning, links, next steps) is shown as it is and never
 * marked. Computed here from the note and text the page already has
 * (lib/source-lines.ts); nothing is stored. With the switch off, or if the
 * matcher fails on an odd story, it renders the text exactly as before.
 */
export type SourceLinesProps = {
  note: string;
  text: string;
  kind: "story" | "statement";
  childName?: string;
  /** "mine": the educator's own preview ("your note"); otherwise the leader's page. */
  audience?: "leader" | "mine";
};

/** The legend's words (copy-edited 25 Nov). */
export function sourcesLegend(audience: "leader" | "mine" = "leader") {
  return `Numbers show which line of the note each sentence came from. Sentences marked "${notInNote(audience).toLowerCase()}" are worth a look. The learning and next steps are not marked.`;
}

export function notInNote(audience: "leader" | "mine" = "leader") {
  return audience === "mine" ? "Not in your note" : "Not in the note";
}

function safeMatch(props: SourceLinesProps): SourceResult | null {
  try {
    return matchSources({ note: props.note, text: props.text, kind: props.kind, childName: props.childName });
  } catch {
    return null;
  }
}

function Sentence({ sentence, units, audience }: { sentence: SourceSentence; units: string[]; audience: "leader" | "mine" }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <span data-testid="source-sentence" data-status={sentence.status} data-sources={sentence.sources.join(",")}>
      {sentence.text}
      {sentence.sources.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => setOpen(open === n ? null : n)}
          aria-expanded={open === n}
          aria-label={`From note line ${n}`}
          className="ml-1 inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-sage-100 px-1.5 align-middle font-sans text-xs font-bold text-sage-900 hover:bg-sage-200"
          data-testid="source-chip"
        >
          {n}
        </button>
      ))}
      {sentence.status === "unbacked" && (
        <span className="ml-1 inline-block rounded-full bg-clay-50 px-2 py-0.5 align-middle font-sans text-xs font-semibold text-clay-800" data-testid="source-not-in-note">
          {notInNote(audience)}
        </span>
      )}
      {open !== null && units[open - 1] && (
        <span className="my-1 block rounded-lg border border-sage-200 bg-sage-50 px-3 py-2 font-mono text-xs leading-relaxed text-ink-800" data-testid="source-line-shown">
          Note line {open}: {units[open - 1]}
        </span>
      )}{" "}
    </span>
  );
}

export default function SourceLines(props: SourceLinesProps) {
  const { note, text, kind, childName } = props;
  const result = useMemo(() => (LEADER_SOURCES_ON ? safeMatch({ note, text, kind, childName }) : null), [note, text, kind, childName]);
  if (!result) return props.kind === "story" ? <StoryText text={props.text} /> : <>{props.text}</>;
  const audience = props.audience ?? "leader";

  if (props.kind === "statement") {
    const sentences = result.blocks.flatMap((block) => (block.type === "para" ? block.sentences : []));
    return (
      <span data-testid="source-lines" data-kind="statement">
        {sentences.map((sentence, i) => <Sentence key={i} sentence={sentence} units={result.units} audience={audience} />)}
      </span>
    );
  }

  return (
    <div className="story-safe min-w-0 max-w-full break-words" data-testid="source-lines" data-kind="story">
      <p className="mb-4 rounded-xl bg-cream-50 px-3 py-2 text-xs leading-relaxed text-ink-600" data-testid="source-legend">{sourcesLegend(audience)}</p>
      {result.blocks.map((block, index) => {
        if (block.type === "heading") {
          return <p key={index} className="mt-5 mb-2 text-xs font-bold uppercase tracking-[0.18em] text-clay-600 first:mt-0">{block.text}</p>;
        }
        if (block.type === "title") {
          return <p key={index} className="mb-3 font-display text-xl font-bold leading-snug text-ink-900">{block.text}</p>;
        }
        return (
          <p key={index} className="mb-3 font-display text-[15px] leading-relaxed text-ink-800">
            {block.observation
              ? block.sentences.map((sentence, i) => <Sentence key={i} sentence={sentence} units={result.units} audience={audience} />)
              : block.sentences.map((sentence) => sentence.text).join(" ")}
          </p>
        );
      })}
    </div>
  );
}

/** The note with its lines numbered, for the note card when the numbers are shown. */
export function SourceNote({ note, testId }: { note: string; testId?: string }) {
  const units = noteUnits(note);
  return (
    <ol className="mt-3 space-y-1 font-mono text-sm leading-relaxed text-ink-800" data-testid={testId ?? "source-note"}>
      {units.map((unit, i) => (
        <li key={i} className="flex gap-2">
          <span className="inline-flex h-6 min-w-[24px] flex-none items-center justify-center rounded-full bg-sage-100 font-sans text-xs font-bold text-sage-900">{i + 1}</span>
          <span className="min-w-0 break-words">{unit}</span>
        </li>
      ))}
    </ol>
  );
}
