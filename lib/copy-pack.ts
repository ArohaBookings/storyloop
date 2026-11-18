import { hasFeatureAccess } from "@/lib/plans";

/**
 * Copy for my centre's app (proposal F, 18 Nov 2026). The export packs already
 * lay a story out in the field order of the app a centre uses
 * (lib/export-packs.ts, components/app/ExportPackPanel.tsx), but they sat
 * several screens below the story and nobody's use of them was recorded. Now,
 * the moment she copies a story, a button appears right beside Copy that
 * brings the packs up. Same plans as the packs (Educator and up); a free
 * account sees nothing new, as before.
 */

export const COPY_PACK_LABEL = "For my centre's app";

/** Whether the button sits beside Copy (pure): her plan has the packs and she has just copied this story. */
export function showCopyPackBeside(input: { plan: string | null | undefined; storyId: string | null | undefined; copiedStoryId: string | null | undefined }): boolean {
  if (!input.storyId || input.copiedStoryId !== input.storyId) return false;
  return hasFeatureAccess(input.plan ?? "free", "exportPacks");
}
