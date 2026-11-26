import { UserFacingError } from "@/lib/errors";
import { handle } from "@/lib/http";
import { deleteAlbum, getAlbum, getLibrary, NotFoundError, updateAlbum } from "@/lib/storage";
import { findStyle } from "@/lib/types";

export const GET = handle(async (_req: Request, ctx: RouteContext<"/api/albums/[id]">) => {
  const { id } = await ctx.params;
  const album = await getAlbum(id);
  if (!album) throw new NotFoundError("Album introuvable");
  return Response.json(album);
});

export const PATCH = handle(async (request: Request, ctx: RouteContext<"/api/albums/[id]">) => {
  const { id } = await ctx.params;
  const body = (await request.json()) as { name?: string; theme?: string; styleId?: string };
  if (body.styleId && !findStyle(await getLibrary(), body.styleId)) {
    throw new UserFacingError("Style inconnu.");
  }
  const album = await updateAlbum(id, (a) => {
    if (typeof body.name === "string" && body.name.trim()) a.name = body.name.trim();
    if (typeof body.theme === "string") a.theme = body.theme;
    if (typeof body.styleId === "string") a.styleId = body.styleId;
  });
  return Response.json(album);
});

export const DELETE = handle(async (_req: Request, ctx: RouteContext<"/api/albums/[id]">) => {
  const { id } = await ctx.params;
  await deleteAlbum(id);
  return new Response(null, { status: 204 });
});
