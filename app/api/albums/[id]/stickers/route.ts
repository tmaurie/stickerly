import { handle } from "@/lib/http";
import { newId, updateAlbum } from "@/lib/storage";
import { applyDraft } from "@/lib/sticker-draft";
import type { Sticker, StickerDraft } from "@/lib/types";
import { KIND_INFO } from "@/lib/types";

export const POST = handle(async (request: Request, ctx: RouteContext<"/api/albums/[id]/stickers">) => {
  const { id } = await ctx.params;
  const draft = (await request.json()) as Partial<StickerDraft>;
  const kind = draft.kind && draft.kind in KIND_INFO ? draft.kind : "badge";

  const sticker: Sticker = {
    id: newId(),
    kind,
    text: "",
    subject: "",
    details: "",
    outline: KIND_INFO[kind].defaultOutline,
    photos: [],
    favorite: false,
    versions: [],
    createdAt: new Date().toISOString(),
  };
  applyDraft(sticker, draft);

  await updateAlbum(id, (a) => {
    a.stickers.push(sticker);
  });
  return Response.json(sticker, { status: 201 });
});
