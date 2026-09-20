import { handle } from "@/lib/http";
import { createAlbum, listAlbums } from "@/lib/storage";

export const GET = handle(async () => Response.json(await listAlbums()));

export const POST = handle(async (request: Request) => {
  const { name, theme } = (await request.json()) as { name?: string; theme?: string };
  if (!name?.trim()) return Response.json({ error: "Donne un nom à l'album." }, { status: 400 });
  const album = await createAlbum(name.trim(), theme?.trim() ?? "");
  return Response.json(album, { status: 201 });
});
