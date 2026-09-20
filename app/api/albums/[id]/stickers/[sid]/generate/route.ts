import { renderImage, UserFacingError, type InputImage } from "@/lib/ai";
import { handle } from "@/lib/http";
import { buildAdjustPrompt, buildPrompt } from "@/lib/prompt";
import { applyDraft, type StickerPatch } from "@/lib/sticker-draft";
import {
  deleteAsset,
  findSticker,
  getSettings,
  loadStyleReferences,
  newId,
  readAsset,
  saveAsset,
  updateAlbum,
} from "@/lib/storage";
import type { Album, Sticker } from "@/lib/types";
import { currentVersion, KIND_INFO } from "@/lib/types";

type Ctx = RouteContext<"/api/albums/[id]/stickers/[sid]/generate">;

/**
 * Generates a new version of a sticker.
 * - without `instruction`: from scratch, with the house style + reference stickers of the same kind
 * - with `instruction`: edits the current version ("plus simple", "sans texte"…)
 */
export const POST = handle(async (request: Request, ctx: Ctx) => {
  const { id, sid } = await ctx.params;
  const body = (await request.json()) as { draft?: StickerPatch; instruction?: string };
  const instruction = body.instruction?.trim();
  const settings = await getSettings();

  // Save the latest edits from the UI before generating from them.
  const { album, sticker } = await updateAlbum(id, (a) => {
    const s = findSticker(a, sid);
    applyDraft(s, body.draft);
    return { album: structuredClone(a) as Album, sticker: structuredClone(s) as Sticker };
  });

  if (!instruction && !sticker.subject.trim() && !sticker.promptOverride) {
    throw new UserFacingError("Décris d'abord ce qu'il faut dessiner (champ « Sujet »).");
  }

  const photos: InputImage[] = await Promise.all(
    sticker.photos.map(async (file) => ({ name: file, data: await readAsset(id, "photos", file) })),
  );

  let prompt: string;
  let images: InputImage[];
  if (instruction) {
    const base = currentVersion(sticker);
    if (!base) throw new UserFacingError("Génère une première version avant de l'ajuster.");
    images = [{ name: base.file, data: await readAsset(id, "images", base.file) }, ...photos];
    prompt = buildAdjustPrompt(sticker, instruction, {
      style: settings.style,
      photoCount: photos.length,
    });
  } else {
    const refs = await loadStyleReferences(settings, sticker.kind);
    images = [...photos, ...refs];
    prompt =
      sticker.promptOverride?.trim() ||
      buildPrompt(sticker, {
        style: settings.style,
        theme: album.theme,
        styleRefCount: refs.length,
        photoCount: photos.length,
      });
  }

  const size = KIND_INFO[sticker.kind].size;
  const { png, costUsd } = await renderImage({
    prompt,
    images,
    model: settings.model,
    quality: settings.quality,
    size,
  });

  const versionId = newId();
  const file = `${sid}-${versionId}.png`;
  await saveAsset(id, "images", file, png);

  try {
    const updated = await updateAlbum(id, (a) => {
      const s = findSticker(a, sid);
      s.versions.push({
        id: versionId,
        file,
        prompt,
        instruction,
        model: settings.model,
        quality: settings.quality,
        size,
        costUsd,
        createdAt: new Date().toISOString(),
      });
      s.currentVersionId = versionId;
      return s;
    });
    return Response.json(updated);
  } catch (err) {
    // The sticker was deleted while generating.
    await deleteAsset(id, "images", file);
    throw err;
  }
});
