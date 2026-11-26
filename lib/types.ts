export type StickerKind = "badge" | "title" | "motif" | "portrait";

export const STICKER_KINDS: StickerKind[] = ["badge", "title", "motif", "portrait"];

export const KIND_INFO: Record<
  StickerKind,
  {
    label: string;
    emoji: string;
    hint: string;
    textLabel: string;
    textPlaceholder: string;
    subjectPlaceholder: string;
    detailsPlaceholder: string;
    defaultOutline: boolean;
    size: string;
  }
> = {
  badge: {
    label: "Badge de lieu",
    emoji: "📍",
    hint: "Vignette souvenir d'un lieu, avec son nom en bas",
    textLabel: "Nom du lieu",
    textPlaceholder: "FLORENCE",
    subjectPlaceholder: "Le Duomo et le Palazzo Vecchio, toits en terre cuite, collines toscanes et cyprès",
    detailsPlaceholder: "Branches d'olivier de chaque côté du nom, lettres vert foncé",
    defaultOutline: true,
    size: "1248x1248",
  },
  title: {
    label: "Titre de page",
    emoji: "🔤",
    hint: "Bandeau horizontal : une phrase + une petite illustration",
    textLabel: "Phrase",
    textPlaceholder: "Pause gourmande",
    subjectPlaceholder: "Une tasse de café latte art et un croissant, à gauche du texte",
    detailsPlaceholder: "Lettres manuscrites arrondies gris anthracite, sans fond",
    defaultOutline: false,
    // Just under the API's 3:1 maximum ratio.
    size: "2112x720",
  },
  motif: {
    label: "Petit motif",
    emoji: "🍋",
    hint: "Un ou deux objets décoratifs, sans texte",
    textLabel: "Texte (optionnel)",
    textPlaceholder: "",
    subjectPlaceholder: "Un citron et une boule de glace vanille qui se font un câlin",
    detailsPlaceholder: "Petits visages kawaii souriants",
    defaultOutline: true,
    size: "1024x1024",
  },
  portrait: {
    label: "Personnages",
    emoji: "🧑‍🤝‍🧑",
    hint: "Vous en figurines, dans un moment marquant",
    textLabel: "Légende",
    textPlaceholder: "ÉCLIPSE À DEUX",
    subjectPlaceholder: "Un couple (elle : longs cheveux bouclés châtains ; lui : cheveux courts bruns) avec des lunettes d'éclipse, il pointe le ciel",
    detailsPlaceholder: "Ciel de nuit bleu marine avec l'éclipse et quelques étoiles",
    defaultOutline: true,
    size: "1248x1248",
  },
};

export interface StickerVersion {
  id: string;
  file: string;
  prompt: string;
  instruction?: string;
  model: string;
  quality: string;
  size: string;
  /** The Style this version came from. Optional: versions predating the library have none. */
  styleId?: string;
  /** Denormalised, so the trace survives a rename or a deletion of the Style. */
  styleName?: string;
  costUsd?: number;
  createdAt: string;
}

export interface Sticker {
  id: string;
  kind: StickerKind;
  text: string;
  subject: string;
  details: string;
  outline: boolean;
  photos: string[];
  /** Overrides the Album Style for this Sticker alone. */
  styleId?: string;
  promptOverride?: string;
  favorite: boolean;
  versions: StickerVersion[];
  currentVersionId?: string;
  createdAt: string;
}

export interface Album {
  id: string;
  name: string;
  theme: string;
  /** The Style its Stickers use unless one of them says otherwise. */
  styleId?: string;
  stickers: Sticker[];
  createdAt: string;
  updatedAt: string;
}

export interface AlbumSummary {
  id: string;
  name: string;
  theme: string;
  stickerCount: number;
  previews: string[];
  updatedAt: string;
}

export type ImageModelId = "gpt-image-2.5-flare" | "gpt-image-2.5-sunburst";
export type ImageQuality = "low" | "medium" | "high" | "xhigh";

export const IMAGE_MODELS: ImageModelId[] = ["gpt-image-2.5-flare", "gpt-image-2.5-sunburst"];
export const IMAGE_QUALITIES: ImageQuality[] = ["low", "medium", "high", "xhigh"];

/**
 * The names the app says out loud. The raw model ids stay in the API payloads
 * and in the prompt panel; nothing in the interface should print one at the
 * user, and "Mon style" and the album workspace have to agree on the wording.
 */
export const MODEL_INFO: Record<ImageModelId, { label: string; hint: string }> = {
  "gpt-image-2.5-flare": { label: "Flare", hint: "Rapide, très bon au quotidien" },
  "gpt-image-2.5-sunburst": { label: "Sunburst", hint: "Plus précis, idéal pour les retouches" },
};

/** `label` is the full wording in the picker, `short` the one used in a sentence. */
export const QUALITY_INFO: Record<ImageQuality, { label: string; short: string }> = {
  low: { label: "Brouillon", short: "brouillon" },
  medium: { label: "Moyenne", short: "moyenne" },
  high: { label: "Haute (conseillée)", short: "haute" },
  xhigh: { label: "Très haute (plus lente et plus chère)", short: "très haute" },
};

/**
 * A way of rendering a Sticker: its matter, light, palette, lettering.
 *
 * A Style owns the rendering and nothing else. The composition belongs to the
 * Type of sticker, and the quality is a cost decision the Style only supplies a
 * default for. See docs/adr/0001-un-style-possede-le-rendu.md.
 */
export interface Style {
  /** Slug of the name, frozen at creation: it also names the folder under references/. */
  id: string;
  name: string;
  /** What the image model is told about the rendering. */
  description: string;
  model: ImageModelId;
  /** Where a generation starts; the workspace can override it for one run. */
  quality: ImageQuality;
  useReferences: boolean;
  maxReferences: number;
  /** reference file name, inside this Style folder -> kind it illustrates ("none" = not used) */
  references: Record<string, StickerKind | "none">;
  createdAt: string;
}

/** Every Style, plus the one a new Album receives. Never empty. */
export interface StyleLibrary {
  defaultStyleId: string;
  styles: Style[];
}

/** What the client needs to name a Style and preview the prompt it builds. */
export interface StyleSummary {
  id: string;
  name: string;
  description: string;
  model: ImageModelId;
  quality: ImageQuality;
  refCounts: Record<StickerKind, number>;
}

export type StickerDraft = Pick<Sticker, "kind" | "text" | "subject" | "details" | "outline">;

export function currentVersion(sticker: Sticker): StickerVersion | undefined {
  return (
    sticker.versions.find((v) => v.id === sticker.currentVersionId) ??
    sticker.versions[sticker.versions.length - 1]
  );
}

/** How many references a generation of each kind will attach. */
export function referenceCounts(style: Style): Record<StickerKind, number> {
  const counts: Record<StickerKind, number> = { badge: 0, title: 0, motif: 0, portrait: 0 };
  if (!style.useReferences) return counts;
  for (const kind of Object.values(style.references)) {
    if (kind !== "none") counts[kind] = Math.min(counts[kind] + 1, style.maxReferences);
  }
  return counts;
}

export function styleSummary(style: Style): StyleSummary {
  return {
    id: style.id,
    name: style.name,
    description: style.description,
    model: style.model,
    quality: style.quality,
    refCounts: referenceCounts(style),
  };
}

export function findStyle(library: StyleLibrary, id: string | undefined): Style | undefined {
  return id ? library.styles.find((s) => s.id === id) : undefined;
}

/**
 * The Style a generation uses: the Sticker own, else the Album one, else the
 * library default. Always resolved from stored data rather than from a mutable
 * global, so a generation queue draining over minutes cannot be split across
 * two Styles. See docs/adr/0002-resolution-du-style-par-sticker-puis-album.md.
 *
 * The final fallback holds because the library is never empty: the last Style
 * cannot be deleted.
 */
export function resolveStyle(
  library: StyleLibrary,
  album: Pick<Album, "styleId"> | undefined,
  sticker?: Pick<Sticker, "styleId">,
): Style {
  return pickStyle(library.styles, library.defaultStyleId, album?.styleId, sticker?.styleId);
}

/**
 * The resolution order itself, over anything carrying an id.
 *
 * Shared by the server, which generates from the Style, and the client, which
 * previews the prompt from it, so the two cannot drift apart.
 */
export function pickStyle<T extends { id: string }>(
  styles: T[],
  defaultStyleId: string,
  albumStyleId?: string,
  stickerStyleId?: string,
): T {
  const pick = (id?: string) => (id ? styles.find((s) => s.id === id) : undefined);
  return pick(stickerStyleId) ?? pick(albumStyleId) ?? pick(defaultStyleId) ?? styles[0];
}
