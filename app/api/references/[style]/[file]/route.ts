import { readFile } from "node:fs/promises";
import path from "node:path";
import { handle } from "@/lib/http";
import { isSafeName, NotFoundError, styleReferencesDir } from "@/lib/storage";

/**
 * Serves one Exemple de référence. Two dynamic segments because each Style owns
 * its folder, and `isSafeName` forbids a slash inside either of them.
 */
export const GET = handle(
  async (_req: Request, ctx: RouteContext<"/api/references/[style]/[file]">) => {
    const { style, file } = await ctx.params;
    if (!isSafeName(style) || !isSafeName(file)) throw new NotFoundError("Fichier introuvable");
    let data: Buffer;
    try {
      data = await readFile(path.join(styleReferencesDir(style), file));
    } catch {
      throw new NotFoundError("Fichier introuvable");
    }
    const type = /\.jpe?g$/i.test(file)
      ? "image/jpeg"
      : /\.webp$/i.test(file)
        ? "image/webp"
        : "image/png";
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": type, "Cache-Control": "private, max-age=3600" },
    });
  },
);
