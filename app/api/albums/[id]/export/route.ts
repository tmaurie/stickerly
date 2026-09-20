import JSZip from "jszip";
import { UserFacingError } from "@/lib/ai";
import { handle } from "@/lib/http";
import { slugify, stickerFileName } from "@/lib/slug";
import { getAlbum, NotFoundError, readAsset } from "@/lib/storage";
import { currentVersion } from "@/lib/types";

/** Zip of the current version of each sticker. `?scope=favorites` keeps only the favorites. */
export const GET = handle(async (request: Request, ctx: RouteContext<"/api/albums/[id]/export">) => {
  const { id } = await ctx.params;
  const album = await getAlbum(id);
  if (!album) throw new NotFoundError("Album introuvable");

  const favoritesOnly = new URL(request.url).searchParams.get("scope") === "favorites";
  const stickers = album.stickers.filter(
    (s) => s.versions.length > 0 && (!favoritesOnly || s.favorite),
  );
  if (!stickers.length) throw new UserFacingError("Aucun sticker à exporter.");

  const zip = new JSZip();
  await Promise.all(
    stickers.map(async (s, i) => {
      const version = currentVersion(s)!;
      zip.file(stickerFileName(i, s.text || s.subject), await readAsset(id, "images", version.file));
    }),
  );
  const data = await zip.generateAsync({ type: "uint8array" });
  const name = `${slugify(album.name)}${favoritesOnly ? "-favoris" : ""}.zip`;
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
});
