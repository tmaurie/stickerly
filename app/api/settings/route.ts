import { UserFacingError } from "@/lib/ai";
import { handle } from "@/lib/http";
import { DEFAULT_STYLE } from "@/lib/prompt";
import { getSettings, saveSettings } from "@/lib/storage";
import type { ImageModelId, ImageQuality, Settings } from "@/lib/types";
import { STICKER_KINDS } from "@/lib/types";

const MODELS: ImageModelId[] = ["gpt-image-2.5-flare", "gpt-image-2.5-sunburst"];
const QUALITIES: ImageQuality[] = ["low", "medium", "high", "xhigh"];

export const GET = handle(async () => Response.json(await getSettings()));

export const PUT = handle(async (request: Request) => {
  const body = (await request.json()) as Partial<Settings>;
  const current = await getSettings();

  if (body.model && !MODELS.includes(body.model)) throw new UserFacingError("Modèle inconnu.");
  if (body.quality && !QUALITIES.includes(body.quality)) throw new UserFacingError("Qualité inconnue.");

  const references = { ...current.references };
  for (const [file, kind] of Object.entries(body.references ?? {})) {
    if (file in references && (kind === "none" || STICKER_KINDS.includes(kind))) references[file] = kind;
  }

  const next: Settings = {
    style: typeof body.style === "string" ? body.style.trim() || DEFAULT_STYLE : current.style,
    model: body.model ?? current.model,
    quality: body.quality ?? current.quality,
    useReferences: body.useReferences ?? current.useReferences,
    maxReferences: Math.min(Math.max(Number(body.maxReferences ?? current.maxReferences) || 0, 0), 8),
    references,
  };
  return Response.json(await saveSettings(next));
});
