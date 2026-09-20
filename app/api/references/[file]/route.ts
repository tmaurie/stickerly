import { readFile } from "node:fs/promises";
import path from "node:path";
import { handle } from "@/lib/http";
import { isSafeName, NotFoundError, REFERENCES_DIR } from "@/lib/storage";

export const GET = handle(async (_req: Request, ctx: RouteContext<"/api/references/[file]">) => {
  const { file } = await ctx.params;
  if (!isSafeName(file)) throw new NotFoundError("Fichier introuvable");
  let data: Buffer;
  try {
    data = await readFile(path.join(REFERENCES_DIR, file));
  } catch {
    throw new NotFoundError("Fichier introuvable");
  }
  const type = /\.jpe?g$/i.test(file) ? "image/jpeg" : /\.webp$/i.test(file) ? "image/webp" : "image/png";
  return new Response(new Uint8Array(data), {
    headers: { "Content-Type": type, "Cache-Control": "private, max-age=3600" },
  });
});
