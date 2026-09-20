import type { StickerDraft, StickerKind } from "./types";

/**
 * House style, reverse-engineered from the reference stickers.
 * Editable from the "Mon style" page; this is the default value.
 */
export const DEFAULT_STYLE = `- Handmade 3D clay look: everything is sculpted from soft matte polymer clay / plasticine. Rounded, puffy, slightly chunky volumes with a fine, subtle clay texture. Cute and charming, simplified but recognizable details.
- Soft diffuse studio lighting from the top left, gentle soft shadows and ambient occlusion between elements. Matte finish: no glossy highlights, no hard black outlines, no photorealism, no flat vector look.
- Fresh, harmonious palette: soft sky blue, sage and deep greens, warm terracotta and ochre, cream and off-white, deep navy accents. Bright but never neon or oversaturated.
- Lettering: thick, rounded, puffy 3D clay letters (like rolled plasticine), perfectly legible, spelled exactly as written, accents included.`;

const OUTLINE_ON =
  "Die-cut sticker: the whole design is surrounded by a thick, smooth, even white border that follows its outer silhouette, like a vinyl die-cut sticker, with a crisp clean outer edge.";

const OUTLINE_OFF =
  "No sticker border: the elements float directly on the transparent background, with nothing around them.";

const FRAMING =
  "Isolated on a fully transparent background. One single sticker, centered, entirely visible with a small margin, nothing cropped at the edges. No glow, halo or drop shadow around the sticker, no ground shadow, no extra background, no mockup.";

const KIND_TEMPLATES: Record<StickerKind, (s: StickerDraft) => string> = {
  badge: (s) => `TYPE: travel souvenir badge sticker.
SCENE: ${s.subject}. Show it as a charming miniature diorama: the landmark(s) in the center, framed on the sides by trees or vegetation typical of the place, with water, a street or a landscape in the foreground when relevant.
SKY: a soft light-blue sky with 2 or 3 puffy cream-white clay clouds; the top edge of the sticker follows a rounded, cloud-like silhouette.
NAME BANNER: at the bottom, a cream-white area with the name in large, bold, rounded capital clay letters (deep navy blue or deep green, whichever fits the scene best), flanked on each side by one small symmetrical decorative motif typical of the place, with a thin wavy line underneath.`,

  title: (s) => `TYPE: horizontal page-title sticker, wide banner format.
The TEXT is the hero: large puffy clay lettering spanning most of the width, on one or two lines, well spaced and highly legible.
ILLUSTRATION: ${s.subject}, sculpted in the same clay style and integrated with the lettering (next to it, peeking behind it or resting on it). It stays secondary to the text.
Keep the composition compact and airy, with no busy background.`,

  motif: (s) => `TYPE: small standalone decorative sticker.
SUBJECT: ${s.subject}. One to three simple, iconic elements grouped tightly, with a clear and readable silhouette and generous simplification. No scene, no background.`,

  portrait: (s) => `TYPE: character sticker.
CHARACTERS: ${s.subject}. Cute clay figurines with slightly oversized heads, big joyful expressions, soft rounded hands, and sculpted hair with visible clay strands or curls.
BACKDROP: a simple vignette behind them that evokes the moment, inside a rounded cloud-shaped frame.
CAPTION BANNER: at the bottom, a rounded pill-shaped banner in a deep color that matches the scene, with the text in cream puffy clay capital letters and a tiny sparkle on each side.`,
};

export interface PromptContext {
  style: string;
  theme?: string;
  styleRefCount?: number;
  photoCount?: number;
}

function textRule(s: StickerDraft): string {
  const text = s.text.trim();
  if (!text) return "TEXT: none. No letters, words or numbers anywhere in the image.";
  return `TEXT to display, exactly and only this (keep the case and accents): "${text}"`;
}

function imagesRule({ styleRefCount = 0, photoCount = 0 }: PromptContext): string | null {
  const lines: string[] = [];
  let index = 1;
  if (photoCount > 0) {
    const range = photoCount === 1 ? `Image ${index}` : `Images ${index} to ${index + photoCount - 1}`;
    lines.push(
      `${range}: real photos of the subject, used for likeness only. Keep the recognizable identity traits (for people: face shape, hair color, length and texture, skin tone, glasses, beard; for places: shapes and colors) and translate them into the clay style. Clothing, pose, accessories and setting follow the description above whenever it mentions them, even if the photos differ; otherwise take the clothing from the photos.`,
    );
    index += photoCount;
  }
  if (styleRefCount > 0) {
    const range =
      styleRefCount === 1 ? `Image ${index}` : `Images ${index} to ${index + styleRefCount - 1}`;
    lines.push(
      `${range}: STYLE REFERENCES ONLY. Match their rendering, clay material, lighting, lettering, colors, border and overall layout. Do NOT copy anything they depict: no subjects, landmarks, characters, faces, clothing, accessories (such as glasses), props or text from them. Everything shown must come from the description above.`,
    );
  }
  return lines.length ? `ATTACHED IMAGES:\n${lines.join("\n")}` : null;
}

export function buildPrompt(sticker: StickerDraft, ctx: PromptContext): string {
  const parts = [
    "Create one sticker illustration for a printed photo album.",
    KIND_TEMPLATES[sticker.kind](sticker),
    sticker.details.trim() ? `EXTRA DETAILS: ${sticker.details.trim()}` : null,
    textRule(sticker),
    `STYLE:\n${ctx.style.trim()}`,
    sticker.outline ? OUTLINE_ON : OUTLINE_OFF,
    FRAMING,
    imagesRule(ctx),
    ctx.theme?.trim() ? `ALBUM CONTEXT (for mood and coherence only): ${ctx.theme.trim()}` : null,
  ];
  return parts.filter(Boolean).join("\n\n");
}

export function buildAdjustPrompt(
  sticker: StickerDraft,
  instruction: string,
  ctx: PromptContext,
): string {
  const text = sticker.text.trim();
  return [
    "Image 1 is an existing sticker. Produce the same sticker again: same composition, subject, colors, clay style, border and transparent background.",
    `Apply only this change: ${instruction.trim()}`,
    text
      ? `The text must stay exactly: "${text}" (unless the change above says otherwise).`
      : "Do not add any text.",
    `STYLE:\n${ctx.style.trim()}`,
    FRAMING,
    ctx.photoCount
      ? `Images 2 onward are real photos of the subject: keep the faces and hair consistent with them. The requested change takes priority over anything else in the photos (clothing, pose, accessories).`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export const ADJUST_SUGGESTIONS = [
  "Plus simple, moins de détails",
  "Texte plus gros et plus lisible",
  "Couleurs plus douces, plus pastel",
  "Couleurs plus vives",
  "Sans contour blanc",
  "Cadrage plus large, rien de coupé",
  "Enlève le texte",
];
