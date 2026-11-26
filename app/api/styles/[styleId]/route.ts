import { UserFacingError } from "@/lib/errors";
import { handle } from "@/lib/http";
import { deleteStyle, NotFoundError, updateLibrary } from "@/lib/storage";
import type { Style } from "@/lib/types";
import { findStyle, IMAGE_MODELS, IMAGE_QUALITIES, STICKER_KINDS } from "@/lib/types";

type Ctx = RouteContext<"/api/styles/[styleId]">;

/**
 * Edits a Style. Its `id` is never among the editable fields: it names the
 * folder under references/, so renaming stays a cosmetic act and never
 * rewrites the Albums, Stickers and Versions that point at it.
 */
export const PUT = handle(async (request: Request, ctx: Ctx) => {
  const { styleId } = await ctx.params;
  const body = (await request.json()) as Partial<Style>;
  if (body.model && !IMAGE_MODELS.includes(body.model)) throw new UserFacingError("Modèle inconnu.");
  if (body.quality && !IMAGE_QUALITIES.includes(body.quality)) {
    throw new UserFacingError("Qualité inconnue.");
  }

  const style = await updateLibrary((library) => {
    const current = findStyle(library, styleId);
    if (!current) throw new NotFoundError("Style introuvable");
    if (typeof body.name === "string" && body.name.trim()) current.name = body.name.trim();
    if (typeof body.description === "string" && body.description.trim()) {
      current.description = body.description.trim();
    }
    if (body.model) current.model = body.model;
    if (body.quality) current.quality = body.quality;
    if (typeof body.useReferences === "boolean") current.useReferences = body.useReferences;
    if (body.maxReferences !== undefined) {
      current.maxReferences = Math.min(Math.max(Number(body.maxReferences) || 0, 0), 8);
    }
    for (const [file, kind] of Object.entries(body.references ?? {})) {
      if (file in current.references && (kind === "none" || STICKER_KINDS.includes(kind))) {
        current.references[file] = kind;
      }
    }
    return current;
  });
  return Response.json(style);
});

export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  const { styleId } = await ctx.params;
  return Response.json(await deleteStyle(styleId));
});
