import type { Sticker } from "./types";
import { KIND_INFO } from "./types";

export type StickerPatch = Partial<
  Pick<Sticker, "kind" | "text" | "subject" | "details" | "outline" | "favorite" | "currentVersionId">
> & { promptOverride?: string | null };

/** Copies the editable fields of a client payload onto a sticker, ignoring anything else. */
export function applyDraft(sticker: Sticker, patch: StickerPatch | undefined): void {
  if (!patch) return;
  if (patch.kind && patch.kind in KIND_INFO) sticker.kind = patch.kind;
  if (typeof patch.text === "string") sticker.text = patch.text;
  if (typeof patch.subject === "string") sticker.subject = patch.subject;
  if (typeof patch.details === "string") sticker.details = patch.details;
  if (typeof patch.outline === "boolean") sticker.outline = patch.outline;
  if (typeof patch.favorite === "boolean") sticker.favorite = patch.favorite;
  if (patch.currentVersionId && sticker.versions.some((v) => v.id === patch.currentVersionId)) {
    sticker.currentVersionId = patch.currentVersionId;
  }
  if (patch.promptOverride === null || patch.promptOverride === "") delete sticker.promptOverride;
  else if (typeof patch.promptOverride === "string") sticker.promptOverride = patch.promptOverride;
}
