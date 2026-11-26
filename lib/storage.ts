import "server-only";
import { randomUUID } from "node:crypto";
import { cp, mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { UserFacingError } from "./errors";
import { DEFAULT_STYLE } from "./prompt";
import { slugify } from "./slug";
import type { Album, AlbumSummary, Sticker, StickerKind, Style, StyleLibrary } from "./types";
import { currentVersion, findStyle } from "./types";

export const DATA_DIR = path.join(process.cwd(), "data");
export const REFERENCES_DIR = path.join(process.cwd(), "references");
const ALBUMS_DIR = path.join(DATA_DIR, "albums");

export type AlbumAsset = "images" | "photos";

const SAFE_NAME = /^[\w.,\- ]+$/;

export function isSafeName(name: string): boolean {
  return SAFE_NAME.test(name) && !name.includes("..");
}

export function newId(): string {
  return randomUUID().replace(/-/g, "").slice(0, 12);
}

export function albumDir(albumId: string): string {
  if (!isSafeName(albumId)) throw new Error("Invalid album id");
  return path.join(ALBUMS_DIR, albumId);
}

export function assetPath(albumId: string, kind: AlbumAsset, file: string): string {
  if (!isSafeName(file)) throw new Error("Invalid file name");
  return path.join(albumDir(albumId), kind, file);
}

async function writeJson(file: string, data: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${newId()}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  try {
    await rename(tmp, file);
  } catch {
    // Windows can refuse the rename while another process holds the file.
    await writeFile(file, JSON.stringify(data, null, 2), "utf8");
    await rm(tmp, { force: true });
  }
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

// One write queue per album so concurrent generations don't overwrite each other.
const globalLocks = globalThis as unknown as { __stickerlyLocks?: Map<string, Promise<unknown>> };
const locks = (globalLocks.__stickerlyLocks ??= new Map());

function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve();
  const next = previous.then(fn, fn);
  locks.set(
    key,
    next.catch(() => undefined),
  );
  return next;
}

/* ---------- Albums ---------- */

export async function listAlbums(): Promise<AlbumSummary[]> {
  let ids: string[] = [];
  try {
    ids = await readdir(ALBUMS_DIR);
  } catch {
    return [];
  }
  const albums = await Promise.all(ids.filter(isSafeName).map((id) => getAlbum(id)));
  return albums
    .filter((a): a is Album => a !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((a) => ({
      id: a.id,
      name: a.name,
      theme: a.theme,
      stickerCount: a.stickers.filter((s) => s.versions.length > 0).length,
      previews: a.stickers
        .filter((s) => s.versions.length > 0)
        .sort((x, y) => Number(y.favorite) - Number(x.favorite))
        .slice(0, 4)
        .map((s) => currentVersion(s)!.file),
      updatedAt: a.updatedAt,
    }));
}

export async function getAlbum(id: string): Promise<Album | null> {
  return readJson<Album>(path.join(albumDir(id), "album.json"));
}

export async function createAlbum(name: string, theme: string): Promise<Album> {
  const now = new Date().toISOString();
  const album: Album = { id: newId(), name, theme, stickers: [], createdAt: now, updatedAt: now };
  await writeJson(path.join(albumDir(album.id), "album.json"), album);
  return album;
}

/** Read-modify-write under the album lock. The mutator may return a value (defaults to the album). */
export function updateAlbum<T = Album>(
  id: string,
  mutate: (album: Album) => T | Promise<T>,
): Promise<T> {
  return withLock(id, async () => {
    const album = await getAlbum(id);
    if (!album) throw new NotFoundError("Album introuvable");
    const result = await mutate(album);
    album.updatedAt = new Date().toISOString();
    await writeJson(path.join(albumDir(id), "album.json"), album);
    return (result === undefined ? album : result) as T;
  });
}

export async function deleteAlbum(id: string): Promise<void> {
  await withLock(id, () => rm(albumDir(id), { recursive: true, force: true }));
}

export function findSticker(album: Album, stickerId: string): Sticker {
  const sticker = album.stickers.find((s) => s.id === stickerId);
  if (!sticker) throw new NotFoundError("Sticker introuvable");
  return sticker;
}

export async function saveAsset(
  albumId: string,
  kind: AlbumAsset,
  file: string,
  data: Buffer,
): Promise<void> {
  const target = assetPath(albumId, kind, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, data);
}

export async function readAsset(albumId: string, kind: AlbumAsset, file: string): Promise<Buffer> {
  return readFile(assetPath(albumId, kind, file));
}

export async function deleteAsset(albumId: string, kind: AlbumAsset, file: string): Promise<void> {
  await rm(assetPath(albumId, kind, file), { force: true });
}

/* ---------- Styles ---------- */

const STYLES_FILE = path.join(DATA_DIR, "styles.json");

/** The Style the migration folds the old global settings into. */
export const SEED_STYLE_ID = "pate-a-modeler";
export const SEED_STYLE_NAME = "Pâte à modeler";

/** Which kind each of the original reference stickers illustrates. */
const DEFAULT_REFERENCE_KINDS: [string, StickerKind][] = [
  ["16 sept. 2026, 19_19_28", "title"],
  ["16 sept. 2026, 19_19_34", "title"],
  ["16 sept. 2026, 19_33_40", "title"],
  ["17 sept. 2026, 00_10_09", "motif"],
  ["17 sept. 2026, 10_50_53", "badge"],
  ["17 sept. 2026, 11_06_25", "badge"],
  ["17 sept. 2026, 11_08_00", "badge"],
  ["17 sept. 2026, 11_11_42", "badge"],
  ["17 sept. 2026, 11_13_57", "badge"],
  ["17 sept. 2026, 11_17_55", "badge"],
  ["17 sept. 2026, 11_19_58", "badge"],
  ["17 sept. 2026, 14_14_59", "badge"],
  ["18 sept. 2026, 22_55_56", "badge"],
  ["18 sept. 2026, 23_09_00", "badge"],
  ["18 sept. 2026, 23_18_45", "portrait"],
  ["18 sept. 2026, 23_20_25", "motif"],
];

const IMAGE_EXT = /\.(png|jpe?g|webp)$/i;

/**
 * Where a Style keeps its Exemples de référence.
 *
 * One folder per Style, because a reference image *is* the style: sharing one
 * between two Styles drags the rendering of the first into the second. The id
 * is a slug rather than an opaque id precisely so this folder stays readable,
 * since it is a place the user opens by hand to drop PNGs into.
 * See docs/adr/0003-un-dossier-de-references-par-style.md.
 */
export function styleReferencesDir(styleId: string): string {
  if (!isSafeName(styleId)) throw new Error("Invalid style id");
  return path.join(REFERENCES_DIR, styleId);
}

export async function listReferenceFiles(styleId: string): Promise<string[]> {
  try {
    return (await readdir(styleReferencesDir(styleId)))
      .filter((f) => IMAGE_EXT.test(f) && isSafeName(f))
      .sort();
  } catch {
    return [];
  }
}

/** Re-reads the folder, so a PNG dropped in by hand appears, keeping the kinds already assigned. */
async function withFolderReferences(style: Style): Promise<Style> {
  const files = await listReferenceFiles(style.id);
  const references: Style["references"] = {};
  for (const file of files) {
    const known = style.references?.[file];
    const guessed =
      style.id === SEED_STYLE_ID
        ? DEFAULT_REFERENCE_KINDS.find(([key]) => file.includes(key))?.[1]
        : undefined;
    references[file] = known ?? guessed ?? "none";
  }
  return { ...style, references };
}

export function seedStyle(): Style {
  return {
    id: SEED_STYLE_ID,
    name: SEED_STYLE_NAME,
    description: DEFAULT_STYLE,
    model: "gpt-image-2.5-flare",
    quality: "high",
    useReferences: true,
    maxReferences: 3,
    references: {},
    createdAt: new Date().toISOString(),
  };
}

/**
 * The Bibliothèque de styles, seeded on first read so a fresh clone works.
 *
 * Seeding writes a record and never moves a file: carrying the reference images
 * into their Style folder is the one-shot migration script, because touching
 * git-tracked files during a page load would be indefensible.
 */
export async function getLibrary(): Promise<StyleLibrary> {
  const stored = await readJson<StyleLibrary>(STYLES_FILE);
  const styles = stored?.styles?.length ? stored.styles : [seedStyle()];
  const hydrated = await Promise.all(styles.map(withFolderReferences));
  const stillThere = hydrated.some((s) => s.id === stored?.defaultStyleId);
  return {
    defaultStyleId: stillThere ? stored!.defaultStyleId : hydrated[0].id,
    styles: hydrated,
  };
}

/** Read-modify-write under the styles lock. The mutator may return a value (defaults to the library). */
export function updateLibrary<T = StyleLibrary>(
  mutate: (library: StyleLibrary) => T | Promise<T>,
): Promise<T> {
  return withLock("__styles", async () => {
    const library = await getLibrary();
    const result = await mutate(library);
    await writeJson(STYLES_FILE, library);
    return (result === undefined ? library : result) as T;
  });
}

export async function saveLibrary(library: StyleLibrary): Promise<StyleLibrary> {
  await writeJson(STYLES_FILE, library);
  return getLibrary();
}

/** A slug of the name, suffixed until free. Frozen afterwards: renaming never moves the folder. */
function freshStyleId(library: StyleLibrary, name: string): string {
  const base = slugify(name);
  let id = base;
  for (let n = 2; library.styles.some((s) => s.id === id); n++) id = `${base}-${n}`;
  return id;
}

/**
 * Creates a Style, optionally duplicating `from`.
 *
 * A duplicate copies the reference folder rather than pointing at the source
 * one: two Styles sharing images would reintroduce the very leak that the
 * one-folder-per-Style rule exists to prevent.
 */
export async function createStyle(name: string, from?: string): Promise<Style> {
  return updateLibrary(async (library) => {
    const source = from ? findStyle(library, from) : undefined;
    if (from && !source) throw new NotFoundError("Style introuvable");
    const id = freshStyleId(library, name);
    const style: Style = {
      ...(source ? structuredClone(source) : seedStyle()),
      id,
      name,
      createdAt: new Date().toISOString(),
    };
    if (!source) style.references = {};
    library.styles.push(style);
    if (source) {
      try {
        await cp(styleReferencesDir(source.id), styleReferencesDir(id), { recursive: true });
      } catch (err) {
        // The source Style simply has no folder yet.
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      }
    }
    return style;
  });
}

/**
 * Deletes a Style. Its folder stays: erasing hand-picked, git-tracked source
 * images on a click is not something the app allows itself. Albums pointing at
 * it fall back to the Style par défaut, and the `styleName` each Version holds
 * keeps the trace.
 */
export async function deleteStyle(id: string): Promise<StyleLibrary> {
  return updateLibrary((library) => {
    const style = findStyle(library, id);
    if (!style) throw new NotFoundError("Style introuvable");
    if (library.styles.length <= 1) {
      throw new UserFacingError(
        "Impossible de supprimer le dernier style : la bibliothèque ne peut pas être vide.",
      );
    }
    library.styles = library.styles.filter((s) => s.id !== id);
    if (library.defaultStyleId === id) library.defaultStyleId = library.styles[0].id;
    return library;
  });
}

/** A random pick of the Exemples de référence of this kind (random, so no single one gets copied). */
export async function loadStyleReferences(
  style: Style,
  kind: StickerKind,
): Promise<{ name: string; data: Buffer }[]> {
  if (!style.useReferences) return [];
  const files = Object.entries(style.references)
    .filter(([, k]) => k === kind)
    .map(([file]) => file)
    .sort(() => Math.random() - 0.5)
    .slice(0, style.maxReferences);
  const dir = styleReferencesDir(style.id);
  return Promise.all(
    files.map(async (file) => ({ name: file, data: await readFile(path.join(dir, file)) })),
  );
}

export class NotFoundError extends Error {}
