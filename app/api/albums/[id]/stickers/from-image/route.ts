import { describeImage, UserFacingError } from "@/lib/ai";
import { handle } from "@/lib/http";
import {
  deleteAsset,
  getAlbum,
  newId,
  NotFoundError,
  saveAsset,
  updateAlbum,
} from "@/lib/storage";
import type { Sticker, StickerKind } from "@/lib/types";
import { KIND_INFO } from "@/lib/types";
import { IMAGE_EXTENSIONS, imageRejection } from "@/lib/upload";

type Ctx = RouteContext<"/api/albums/[id]/stickers/from-image">;

/**
 * Creates a sticker from an uploaded image, for the chosen kind.
 *
 * The image is read to prefill the description, and kept as the sticker's
 * reference photo so the generation keeps its likeness. Nothing is drawn here:
 * the caller generates the sticker through the usual endpoint, which is what
 * makes versions, adjustments and favourites work on it like on any other.
 */
export const POST = handle(async (request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const form = await request.formData();
  const file = form.get("image");
  const kindValue = String(form.get("kind") ?? "");

  if (!(file instanceof File)) throw new UserFacingError("Aucune image reçue.");
  if (!(kindValue in KIND_INFO)) {
    throw new UserFacingError("Choisis d'abord le type de sticker à créer.");
  }
  const rejection = imageRejection(file);
  if (rejection) throw new UserFacingError(rejection);
  const kind = kindValue as StickerKind;

  // Before the description call, which costs a request.
  const album = await getAlbum(id);
  if (!album) throw new NotFoundError("Album introuvable");

  const data = Buffer.from(await file.arrayBuffer());
  const description = await describeImage({
    image: data,
    kind,
    albumName: album.name,
    theme: album.theme,
  });

  const stickerId = newId();
  const photo = `${stickerId}-${newId()}.${IMAGE_EXTENSIONS[file.type]}`;
  await saveAsset(id, "photos", photo, data);

  const sticker: Sticker = {
    id: stickerId,
    kind,
    text: description.text,
    subject: description.subject,
    details: description.details,
    outline: description.outline,
    photos: [photo],
    favorite: false,
    versions: [],
    createdAt: new Date().toISOString(),
  };

  try {
    await updateAlbum(id, (a) => {
      a.stickers.push(sticker);
    });
  } catch (err) {
    // The album was deleted while the image was being read.
    await deleteAsset(id, "photos", photo);
    throw err;
  }
  return Response.json(sticker, { status: 201 });
});
