import { renderImage, type InputImage } from "@/lib/ai";
import { UserFacingError } from "@/lib/errors";
import { handle } from "@/lib/http";
import { buildAdjustPrompt, buildPrompt } from "@/lib/prompt";
import { applyDraft, type StickerPatch } from "@/lib/sticker-draft";
import {
  deleteAsset,
  findSticker,
  getLibrary,
  loadStyleReferences,
  newId,
  readAsset,
  saveAsset,
  updateAlbum,
} from "@/lib/storage";
import type { Album, ImageQuality, Sticker } from "@/lib/types";
import { currentVersion, findStyle, IMAGE_QUALITIES, KIND_INFO, resolveStyle } from "@/lib/types";

type Ctx = RouteContext<"/api/albums/[id]/stickers/[sid]/generate">;

/**
 * Generates a new version of a sticker.
 * - without `instruction`: from scratch, with the resolved Style and its Exemples de référence
 * - with `instruction`: edits the current version ("plus simple", "sans texte"…)
 *
 * The Style is resolved per sticker from stored data, never from a global, so a
 * generation queue draining over minutes cannot be split across two Styles.
 * An adjustment resolves it from the version it adjusts instead, so that
 * "apply only this change" never quietly restyles.
 * See docs/adr/0002-resolution-du-style-par-sticker-puis-album.md.
 */
export const POST = handle(async (request: Request, ctx: Ctx) => {
  const { id, sid } = await ctx.params;
  const body = (await request.json()) as {
    draft?: StickerPatch;
    instruction?: string;
    /** One-off override of the Style default; the quality is a cost decision, not a style. */
    quality?: ImageQuality;
  };
  const instruction = body.instruction?.trim();
  const library = await getLibrary();

  // Save the latest edits from the UI before generating from them.
  const { album, sticker } = await updateAlbum(id, (a) => {
    const s = findSticker(a, sid);
    applyDraft(s, body.draft);
    return { album: structuredClone(a) as Album, sticker: structuredClone(s) as Sticker };
  });

  if (!instruction && !sticker.subject.trim() && !sticker.promptOverride) {
    throw new UserFacingError("Décris d'abord ce qu'il faut dessiner (champ « Sujet »).");
  }

  const base = instruction ? currentVersion(sticker) : undefined;
  if (instruction && !base) {
    throw new UserFacingError("Génère une première version avant de l'ajuster.");
  }
  const style = base
    ? (findStyle(library, base.styleId) ?? resolveStyle(library, album, sticker))
    : resolveStyle(library, album, sticker);
  const quality =
    body.quality && IMAGE_QUALITIES.includes(body.quality) ? body.quality : style.quality;

  const photos: InputImage[] = await Promise.all(
    sticker.photos.map(async (file) => ({ name: file, data: await readAsset(id, "photos", file) })),
  );

  let prompt: string;
  let images: InputImage[];
  if (base) {
    images = [{ name: base.file, data: await readAsset(id, "images", base.file) }, ...photos];
    prompt = buildAdjustPrompt(sticker, instruction!, {
      style: style.description,
      photoCount: photos.length,
    });
  } else {
    const refs = await loadStyleReferences(style, sticker.kind);
    images = [...photos, ...refs];
    prompt =
      sticker.promptOverride?.trim() ||
      buildPrompt(sticker, {
        style: style.description,
        theme: album.theme,
        styleRefCount: refs.length,
        photoCount: photos.length,
      });
  }

  const size = KIND_INFO[sticker.kind].size;
  const { png, costUsd } = await renderImage({
    prompt,
    images,
    model: style.model,
    quality,
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
        model: style.model,
        quality,
        size,
        styleId: style.id,
        // Denormalised, so the trace survives a rename or a deletion of the Style.
        styleName: style.name,
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
