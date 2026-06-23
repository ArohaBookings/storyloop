// Renders a plain-text learning story with styled section headings.
// Presentation-only: the underlying text (used for copy/export/edit) is unchanged.

const SECTION_HEADINGS = new Set([
  "learning story",
  "what learning we noticed",
  "what learning i noticed",
  "curriculum links",
  "curriculum link",
  "eylf links",
  "eylf link",
  "te whāriki links",
  "te whariki links",
  "te whāriki link",
  "te whariki link",
  "where to next / responding",
  "where to next",
  "responding",
  "family link",
  "family/whānau link",
  "family/whanau link",
  "whānau link",
  "whanau link",
]);

function isSectionHeading(block: string) {
  const trimmed = block.trim();
  if (trimmed.length === 0 || trimmed.length > 40) return false;
  if (trimmed.includes("\n")) return false;
  return SECTION_HEADINGS.has(trimmed.toLowerCase());
}

export default function StoryText({ text, className = "" }: { text: string; className?: string }) {
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.replace(/\s+$/, ""))
    .filter((block) => block.trim().length > 0);

  // Graceful fallback: if there is nothing to structure, render the raw text.
  if (blocks.length <= 1) {
    return (
      <div className={`story-safe whitespace-pre-wrap break-words font-display leading-relaxed text-ink-800 ${className}`}>
        {text}
      </div>
    );
  }

  let titleRendered = false;

  return (
    <div className={`story-safe min-w-0 max-w-full break-words ${className}`}>
      {blocks.map((block, index) => {
        if (isSectionHeading(block)) {
          return (
            <p
              key={index}
              className="mt-5 mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-clay-600 first:mt-0"
            >
              {block.trim()}
            </p>
          );
        }

        // The first non-heading block is the story title.
        if (!titleRendered) {
          titleRendered = true;
          return (
            <p key={index} className="mb-3 font-display text-xl font-bold leading-snug text-ink-900">
              {block.trim()}
            </p>
          );
        }

        return (
          <p
            key={index}
            className="mb-3 whitespace-pre-line font-display text-[15px] leading-relaxed text-ink-800"
          >
            {block.trim()}
          </p>
        );
      })}
    </div>
  );
}
