import { pieceText, type SetView } from "@/lib/leader-sets";

/**
 * "Save all as one file" (25 Nov 2026, A5): every piece of a set as one plain
 * text file, in the order the educator wrote them, each in the same layout as
 * the drafter's Copy all, with the leader's answer under it. First names only,
 * because that is all a set ever holds. Pure.
 */
export function setText(view: Pick<SetView, "educator" | "centreName" | "items">) {
  const items = [...view.items].sort((a, b) => a.position - b.position);
  const head = `${items.length} ${items.length === 1 ? "statement" : "statements"} from ${view.educator}${view.centreName ? ` at ${view.centreName}` : ""}`;
  const line = "-".repeat(40);
  return [head, ...items.map((piece) => `${line}\n${pieceText(piece)}`)].join("\n\n") + "\n";
}

/** A plain file name: "statements-from-sam.txt". */
export function setFileName(view: Pick<SetView, "educator">) {
  const who = view.educator.toLocaleLowerCase("en-NZ").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "educator";
  return `statements-from-${who}.txt`;
}
