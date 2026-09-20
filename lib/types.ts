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

export interface Settings {
  style: string;
  model: ImageModelId;
  quality: ImageQuality;
  useReferences: boolean;
  maxReferences: number;
  /** reference file name -> kind it illustrates ("none" = not used) */
  references: Record<string, StickerKind | "none">;
}

export type StickerDraft = Pick<Sticker, "kind" | "text" | "subject" | "details" | "outline">;

export function currentVersion(sticker: Sticker): StickerVersion | undefined {
  return (
    sticker.versions.find((v) => v.id === sticker.currentVersionId) ??
    sticker.versions[sticker.versions.length - 1]
  );
}
