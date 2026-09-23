import { Fragment } from "react";

/**
 * A real learning-story draft, laid out the way an educator reads one.
 *
 * Section headings are recognised whether the writer put them on their own
 * paragraph or directly above the text. Any quote that appears word for word
 * in the note is marked, because keeping a child's words exactly is the
 * promise and the mark lets a reader check it against the note beside it. A
 * quote that is not in the note is left unmarked. Display only: the text is
 * never altered.
 */

const HEADINGS = new Set([
  "learning story",
  "what learning we noticed",
  "what learning i noticed",
  "curriculum links",
  "curriculum link",
  "eylf links",
  "te whāriki links",
  "te whariki links",
  "where to next / responding",
  "where to next",
  "responding",
  "family link",
  "whānau link",
  "whanau link",
  "family/whānau link",
]);

function normalise(text: string) {
  return text.toLowerCase().replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[^a-z0-9āēīōū' ]+/g, " ").replace(/\s+/g, " ").trim();
}

export function QuoteMarks({ text, note }: { text: string; note: string }) {
  const noteKey = normalise(note);
  const parts = text.split(/("[^"\n]{1,160}"|“[^”\n]{1,160}”)/g);
  return (
    <>
      {parts.map((part, index) => {
        const inner = /^["“]/.test(part) ? normalise(part.slice(1, -1)) : "";
        if (inner && noteKey.includes(inner)) {
          return (
            <mark key={index} className="rounded bg-sage-100 px-1 font-semibold text-sage-900" title="In the note, word for word">
              {part}
            </mark>
          );
        }
        return <Fragment key={index}>{part}</Fragment>;
      })}
    </>
  );
}

export default function DraftStory({ story, note, showTitle = true, className = "" }: { story: string; note: string; showTitle?: boolean; className?: string }) {
  const lines = story.split("\n").map((line) => line.trim());
  let titleDone = false;
  const out: React.ReactNode[] = [];
  lines.forEach((line, index) => {
    if (!line) return;
    if (!titleDone) {
      titleDone = true;
      if (showTitle) {
        out.push(
          <h3 key={index} className="font-display text-2xl font-bold leading-snug text-ink-900">
            {line}
          </h3>,
        );
      }
      return;
    }
    if (HEADINGS.has(line.toLowerCase())) {
      out.push(
        <p key={index} className="mt-6 mb-2 text-xs font-bold uppercase tracking-[0.16em] text-clay-700 first:mt-0">
          {line}
        </p>,
      );
      return;
    }
    out.push(
      <p key={index} className="mb-3 text-[15px] leading-relaxed text-ink-800">
        <QuoteMarks text={line} note={note} />
      </p>,
    );
  });
  return <div className={`story-safe min-w-0 break-words ${className}`}>{out}</div>;
}
