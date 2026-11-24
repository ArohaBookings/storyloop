/**
 * Where each line came from: a story or statement shown beside the note it
 * was written from (25 Nov 2026, switch LEADER_SOURCES_ON, deferred).
 *
 * STUB: renders the text exactly as the leader's page shows it today. Lane C
 * owns the body; lane A imports it into the leader page and the preview.
 */
export type SourceLinesProps = {
  note: string;
  text: string;
  kind: "story" | "statement";
};

export default function SourceLines({ text }: SourceLinesProps) {
  return <>{text}</>;
}
