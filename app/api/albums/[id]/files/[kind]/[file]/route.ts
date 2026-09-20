import { handle } from "@/lib/http";
import { isSafeName, NotFoundError, readAsset } from "@/lib/storage";

const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };

/** Serves generated images and uploaded photos. `?download=name.png` forces a download. */
export const GET = handle(
  async (request: Request, ctx: RouteContext<"/api/albums/[id]/files/[kind]/[file]">) => {
    const { id, kind, file } = await ctx.params;
    if ((kind !== "images" && kind !== "photos") || !isSafeName(file)) {
      throw new NotFoundError("Fichier introuvable");
    }
    let data: Buffer;
    try {
      data = await readAsset(id, kind, file);
    } catch {
      throw new NotFoundError("Fichier introuvable");
    }
    const download = new URL(request.url).searchParams.get("download");
    const headers: Record<string, string> = {
      "Content-Type": TYPES[file.split(".").pop() ?? ""] ?? "application/octet-stream",
      "Cache-Control": "private, max-age=31536000, immutable",
    };
    if (download) {
      headers["Content-Disposition"] =
        `attachment; filename="sticker.png"; filename*=UTF-8''${encodeURIComponent(download)}`;
    }
    return new Response(new Uint8Array(data), { headers });
  },
);
