import { UserFacingError } from "@/lib/errors";
import { handle } from "@/lib/http";
import { deleteAsset, findSticker, getLibrary, updateAlbum } from "@/lib/storage";
import { applyDraft, type StickerPatch } from "@/lib/sticker-draft";
import type { Sticker } from "@/lib/types";
import { findStyle } from "@/lib/types";

type Ctx = RouteContext<"/api/albums/[id]/stickers/[sid]">;

export const PATCH = handle(async (request: Request, ctx: Ctx) => {
  const { id, sid } = await ctx.params;
  const patch = (await request.json()) as StickerPatch;
  if (patch.styleId && !findStyle(await getLibrary(), patch.styleId)) {
    throw new UserFacingError("Style inconnu.");
  }
  const sticker = await updateAlbum(id, (a) => {
    const s = findSticker(a, sid);
    applyDraft(s, patch);
    return s;
  });
  return Response.json(sticker);
});

export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  const { id, sid } = await ctx.params;
  const removed = await updateAlbum<Sticker>(id, (a) => {
    const s = findSticker(a, sid);
    a.stickers = a.stickers.filter((x) => x.id !== sid);
    return s;
  });
  await Promise.all([
    ...removed.versions.map((v) => deleteAsset(id, "images", v.file)),
    ...removed.photos.map((p) => deleteAsset(id, "photos", p)),
  ]);
  return new Response(null, { status: 204 });
});
