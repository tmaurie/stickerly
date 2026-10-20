import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import OpenAI, { toFile } from "openai";
import type { ImagesResponse } from "openai/resources/images";
import { clearTransparentPixels, shrinkForVision } from "./image";
import { listReferenceFiles, REFERENCES_DIR } from "./storage";
import type { ImageModelId, ImageQuality, StickerDraft, StickerKind } from "./types";
import { KIND_INFO, STICKER_KINDS } from "./types";

/** Demo mode: no API calls, returns reference images and canned ideas. */
export const FAKE_AI = process.env.STICKERLY_FAKE_AI === "1";

const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL ?? "gpt-5.6-luna";

// USD per 1M tokens for gpt-image-2.5 (OpenAI pricing page, September 2026).
const IMAGE_PRICES = { textIn: 5, imageIn: 8, imageOut: 30 };

export class UserFacingError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

function openai(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new UserFacingError(
      "Clé OpenAI manquante : ajoute OPENAI_API_KEY dans le fichier .env.local puis relance le serveur.",
      500,
    );
  }
  return new OpenAI();
}

/** Turns OpenAI errors into something readable in the UI. */
export function explainError(err: unknown): { message: string; status: number } {
  if (err instanceof UserFacingError) return { message: err.message, status: err.status };
  if (err instanceof OpenAI.APIError) {
    const detail = err.error && typeof err.error === "object" && "message" in err.error
      ? String(err.error.message)
      : err.message;
    if (err.status === 401) return { message: "Clé OpenAI refusée (401). Vérifie OPENAI_API_KEY.", status: 500 };
    if (err.status === 429) return { message: `Limite OpenAI atteinte (429) : ${detail}`, status: 429 };
    if (err.code === "moderation_blocked" || /safety|moderation/i.test(detail)) {
      return { message: `Refusé par la modération OpenAI : ${detail}`, status: 400 };
    }
    return { message: `Erreur OpenAI (${err.status ?? "?"}) : ${detail}`, status: 502 };
  }
  console.error(err);
  return { message: err instanceof Error ? err.message : "Erreur inconnue", status: 500 };
}

export interface InputImage {
  name: string;
  data: Buffer;
}

export interface RenderOptions {
  prompt: string;
  /** Sent in this order; the prompt refers to them as "Image 1", "Image 2"… */
  images: InputImage[];
  model: ImageModelId;
  quality: ImageQuality;
  size: string;
}

function mimeType(name: string): string {
  if (/\.jpe?g$/i.test(name)) return "image/jpeg";
  if (/\.webp$/i.test(name)) return "image/webp";
  return "image/png";
}

function estimateCost(usage: ImagesResponse["usage"]): number | undefined {
  if (!usage) return undefined;
  const textIn = usage.input_tokens_details?.text_tokens ?? 0;
  const imageIn = usage.input_tokens_details?.image_tokens ?? 0;
  const cost =
    (textIn * IMAGE_PRICES.textIn + imageIn * IMAGE_PRICES.imageIn + usage.output_tokens * IMAGE_PRICES.imageOut) /
    1_000_000;
  return Math.round(cost * 10_000) / 10_000;
}

export async function renderImage(opts: RenderOptions): Promise<{ png: Buffer; costUsd?: number }> {
  if (FAKE_AI) return fakeRender(opts);

  const client = openai();
  const common = {
    model: opts.model,
    prompt: opts.prompt,
    size: opts.size,
    quality: opts.quality,
    background: "transparent",
    output_format: "png",
    n: 1,
  } as const;

  const response = opts.images.length
    ? await client.images.edit({
        ...common,
        // No input_fidelity: the gpt-image-2.5 models reject it.
        image: await Promise.all(
          opts.images.map((img) => toFile(img.data, img.name, { type: mimeType(img.name) })),
        ),
      })
    : await client.images.generate(common);

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) throw new UserFacingError("OpenAI n'a renvoyé aucune image.", 502);
  const png = await clearTransparentPixels(Buffer.from(b64, "base64"));
  return { png, costUsd: estimateCost(response.usage) };
}

async function fakeRender(opts: RenderOptions): Promise<{ png: Buffer; costUsd?: number }> {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const last = opts.images[opts.images.length - 1];
  if (last) return { png: last.data, costUsd: 0 };
  const [first] = await listReferenceFiles();
  if (!first) throw new UserFacingError("Mode démo : aucune image dans references/.");
  return { png: await readFile(path.join(REFERENCES_DIR, first)), costUsd: 0 };
}

/* ---------- Reading and suggesting sticker descriptions ---------- */

const CLAY_CONTEXT =
  "Tu aides à illustrer des albums photo avec des stickers en pâte à modeler 3D (style figurines d'argile, mignon, couleurs fraîches).";

/** What each type expects in `text`, `subject` and `details`: the ideas and the image reading fill the same fields. */
const KIND_RULES = `Les 4 types possibles :
- "badge" : vignette souvenir d'un lieu (ville, site, monument, région, parc, château…) avec son nom en bas.
  text = le nom tel qu'il apparaîtra, en MAJUSCULES (nom français ou local selon l'usage, ex. "FLORENCE", "TOSCANA", "CINQUE TERRE").
  subject = description visuelle précise de la scène : monuments emblématiques reconnaissables, architecture, éléments typiques (bateaux, végétation, eau, ponts).
  details = le motif décoratif placé de chaque côté du nom (ex. branches d'olivier, ancres, azulejos, trèfles, iris, nénuphars) + la couleur des lettres (bleu marine ou vert foncé).
- "title" : titre de page en bandeau horizontal.
  text = phrase courte en français, jolie, tendre ou avec un jeu de mots (ex. "Pause gourmande", "Chartres de nuit", "Février démarre sur les chapeaux de roue").
  subject = la petite illustration associée et sa position par rapport au texte.
  details = style des lettres (arrondies grasses ou manuscrites arrondies), leur couleur, et un éventuel fond (ex. ciel de nuit bleu marine avec lune et étoiles).
- "motif" : petit élément décoratif (objet, plat, fleur, animal, symbole), sans texte. text = "". Peut avoir de petits visages kawaii.
- "portrait" : les personnes de l'album en figurines, dans un moment marquant. text = courte légende en MAJUSCULES. subject = qui (avec leur apparence si elle est décrite) et ce qu'ils font. Ne propose ce type que si l'album mentionne des personnes.

outline = true pour un contour blanc découpé autour du sticker (presque toujours pour badge, motif et portrait ; au choix pour title).`;

const IDEAS_INSTRUCTIONS = `${CLAY_CONTEXT} Tu proposes des idées de stickers pour l'album décrit.

${KIND_RULES}

Règles :
- Idées concrètes, visuellement précises et fidèles au thème (lieux réellement visités, activités, plats, anecdotes mentionnées).
- Varie les types, sauf si la consigne demande autre chose.
- Ne répète pas un sticker déjà présent dans l'album.
- subject et details en français, 1 à 2 phrases chacun.`;

const DESCRIBE_INSTRUCTIONS = `${CLAY_CONTEXT} On te donne une image fournie par l'utilisateur et le type de sticker à en tirer. Tu remplis les champs du sticker à partir de ce que montre l'image, pour qu'il soit ensuite redessiné dans ce style.

${KIND_RULES}

Règles :
- Décris ce que l'image montre vraiment : les personnes (combien, cheveux, lunettes, barbe, tenue), le lieu, les monuments, les objets, l'ambiance. N'invente rien qui n'y soit pas visible.
- Simplifie : garde ce qui rend la scène reconnaissable et laisse tomber le reste. Un sticker ne reproduit pas une photo, il en garde l'essentiel.
- Respecte le type demandé même si l'image s'y prête mal : adapte-toi (pour un "badge" par exemple, prends le lieu de l'image comme sujet et son nom comme texte).
- text : un nom lisible sur l'image ou déductible du thème de l'album. Si rien ne s'impose, laisse "" (et toujours "" pour un motif).
- subject et details en français, 1 à 2 phrases chacun.`;

/** The editable fields of a sticker, as the model returns them. */
const DRAFT_FIELDS = {
  text: { type: "string" },
  subject: { type: "string" },
  details: { type: "string" },
  outline: { type: "boolean" },
} as const;

const DRAFT_KEYS = ["text", "subject", "details", "outline"] as const;

const IDEAS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["ideas"],
  properties: {
    ideas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", ...DRAFT_KEYS],
        properties: {
          kind: { type: "string", enum: STICKER_KINDS },
          ...DRAFT_FIELDS,
        },
      },
    },
  },
} as const;

/** The same fields minus `kind`: the user picks the type before the image is read. */
const DESCRIBE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: DRAFT_KEYS,
  properties: DRAFT_FIELDS,
} as const;

export async function suggestIdeas(input: {
  albumName: string;
  theme: string;
  existing: StickerDraft[];
  count: number;
  focus?: string;
}): Promise<StickerDraft[]> {
  if (FAKE_AI) return fakeIdeas(input.count);

  const existing = input.existing.length
    ? input.existing.map((s) => `- [${s.kind}] ${s.text || "(sans texte)"} : ${s.subject}`).join("\n")
    : "(aucun)";

  const response = await openai().responses.create({
    model: TEXT_MODEL,
    instructions: IDEAS_INSTRUCTIONS,
    input: `Album : ${input.albumName}
Thème et contexte : ${input.theme || "(non précisé)"}
${input.focus?.trim() ? `Consigne : ${input.focus.trim()}\n` : ""}Stickers déjà présents :
${existing}

Propose exactement ${input.count} nouvelles idées.`,
    text: {
      format: { type: "json_schema", name: "sticker_ideas", strict: true, schema: IDEAS_SCHEMA },
    },
  });

  const parsed = JSON.parse(response.output_text) as { ideas: StickerDraft[] };
  return parsed.ideas.slice(0, input.count);
}

function fakeIdeas(count: number): StickerDraft[] {
  const samples: StickerDraft[] = [
    {
      kind: "badge",
      text: "LUCQUES",
      subject: "Les remparts arborés de Lucques et la tour Guinigi avec ses chênes au sommet",
      details: "Branches d'olivier de chaque côté du nom, lettres vert foncé",
      outline: true,
    },
    {
      kind: "title",
      text: "Dolce vita en Toscane",
      subject: "Une Vespa crème garée à droite du texte",
      details: "Lettres manuscrites arrondies terracotta, sans fond",
      outline: false,
    },
    {
      kind: "motif",
      text: "",
      subject: "Une part de pizza margherita et une boule de gelato pistache",
      details: "Petits visages kawaii souriants",
      outline: true,
    },
  ];
  return Array.from({ length: count }, (_, i) => samples[i % samples.length]);
}

export type StickerDescription = Omit<StickerDraft, "kind">;

/**
 * Turns an uploaded image into the description of a sticker of `kind`.
 *
 * It describes, it does not draw: the sticker is then generated from these
 * fields like any other, so the image never becomes the sticker itself and the
 * result stays editable, adjustable and regenerable.
 */
export async function describeImage(input: {
  image: Buffer;
  kind: StickerKind;
  albumName: string;
  theme: string;
}): Promise<StickerDescription> {
  if (FAKE_AI) return fakeDescription(input.kind);

  const jpeg = await shrinkForVision(input.image);
  const info = KIND_INFO[input.kind];
  const response = await openai().responses.create({
    model: TEXT_MODEL,
    instructions: DESCRIBE_INSTRUCTIONS,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Type de sticker demandé : "${input.kind}" (${info.label} — ${info.hint}).
Album : ${input.albumName}
Thème et contexte : ${input.theme || "(non précisé)"}

Remplis les champs du sticker à partir de l'image ci-dessous.`,
          },
          {
            type: "input_image",
            image_url: `data:image/jpeg;base64,${jpeg.toString("base64")}`,
            detail: "auto",
          },
        ],
      },
    ],
    text: {
      format: { type: "json_schema", name: "sticker_from_image", strict: true, schema: DESCRIBE_SCHEMA },
    },
  });

  return JSON.parse(response.output_text) as StickerDescription;
}

function fakeDescription(kind: StickerKind): StickerDescription {
  return {
    text: kind === "motif" ? "" : "MODE DÉMO",
    subject: "Ce que montre l'image (mode démo : elle n'a pas été lue)",
    details: "Mode démo : décris le sticker toi-même, puis relance la génération",
    outline: KIND_INFO[kind].defaultOutline,
  };
}
