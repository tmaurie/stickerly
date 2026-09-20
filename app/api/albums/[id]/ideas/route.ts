import { suggestIdeas } from "@/lib/ai";
import { handle } from "@/lib/http";
import { getAlbum, newId, NotFoundError, updateAlbum } from "@/lib/storage";
import type { Sticker } from "@/lib/types";

export const POST = handle(async (request: Request, ctx: RouteContext<"/api/albums/[id]/ideas">) => {
  const { id } = await ctx.params;
  const { count = 8, focus } = (await request.json()) as { count?: number; focus?: string };

  const album = await getAlbum(id);
  if (!album) throw new NotFoundError("Album introuvable");

  const ideas = await suggestIdeas({
    albumName: album.name,
    theme: album.theme,
    existing: album.stickers,
    count: Math.min(Math.max(count, 1), 20),
    focus,
  });

  const now = new Date().toISOString();
  const stickers: Sticker[] = ideas.map((idea) => ({
    id: newId(),
    kind: idea.kind,
    text: idea.text,
    subject: idea.subject,
    details: idea.details,
    outline: idea.outline,
    photos: [],
    favorite: false,
    versions: [],
    createdAt: now,
  }));

  await updateAlbum(id, (a) => {
    a.stickers.push(...stickers);
  });
  return Response.json(stickers);
});
