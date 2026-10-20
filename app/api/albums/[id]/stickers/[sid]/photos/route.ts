import { UserFacingError } from "@/lib/ai";
import { handle } from "@/lib/http";
import { deleteAsset, findSticker, isSafeName, newId, saveAsset, updateAlbum } from "@/lib/storage";
import { IMAGE_EXTENSIONS, imageRejection } from "@/lib/upload";

type Ctx = RouteContext<"/api/albums/[id]/stickers/[sid]/photos">;

const MAX_PHOTOS = 4;

/** Reference photos (people, places) attached to one sticker. */
export const POST = handle(async (request: Request, ctx: Ctx) => {
  const { id, sid } = await ctx.params;
  const form = await request.formData();
  const files = form.getAll("photos").filter((f): f is File => f instanceof File);
  if (!files.length) throw new UserFacingError("Aucune photo reçue.");

  const saved: string[] = [];
  for (const file of files) {
    const rejection = imageRejection(file);
    if (rejection) throw new UserFacingError(rejection);
    const name = `${sid}-${newId()}.${IMAGE_EXTENSIONS[file.type]}`;
    await saveAsset(id, "photos", name, Buffer.from(await file.arrayBuffer()));
    saved.push(name);
  }

  // Keep only the most recent photos.
  const { sticker, dropped } = await updateAlbum(id, (a) => {
    const s = findSticker(a, sid);
    s.photos.push(...saved);
    const dropped = s.photos.splice(0, Math.max(0, s.photos.length - MAX_PHOTOS));
    return { sticker: s, dropped };
  });
  await Promise.all(dropped.map((f) => deleteAsset(id, "photos", f)));
  return Response.json(sticker);
});

export const DELETE = handle(async (request: Request, ctx: Ctx) => {
  const { id, sid } = await ctx.params;
  const file = new URL(request.url).searchParams.get("file") ?? "";
  if (!isSafeName(file)) throw new UserFacingError("Nom de fichier invalide.");
  const sticker = await updateAlbum(id, (a) => {
    const s = findSticker(a, sid);
    s.photos = s.photos.filter((p) => p !== file);
    return s;
  });
  await deleteAsset(id, "photos", file);
  return Response.json(sticker);
});
