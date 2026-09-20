import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_STYLE } from "./prompt";
import type { Album, AlbumSummary, Settings, Sticker, StickerKind } from "./types";
import { currentVersion } from "./types";

export const DATA_DIR = path.join(process.cwd(), "data");
export const REFERENCES_DIR = path.join(process.cwd(), "references");
const ALBUMS_DIR = path.join(DATA_DIR, "albums");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

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

/* ---------- Settings ---------- */

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

export async function listReferenceFiles(): Promise<string[]> {
  try {
    return (await readdir(REFERENCES_DIR)).filter((f) => IMAGE_EXT.test(f) && isSafeName(f)).sort();
  } catch {
    return [];
  }
}

export async function getSettings(): Promise<Settings> {
  const stored = await readJson<Partial<Settings>>(SETTINGS_FILE);
  const files = await listReferenceFiles();
  const references: Settings["references"] = {};
  for (const file of files) {
    const known = stored?.references?.[file];
    const guessed = DEFAULT_REFERENCE_KINDS.find(([key]) => file.includes(key))?.[1];
    references[file] = known ?? guessed ?? "none";
  }
  return {
    style: stored?.style ?? DEFAULT_STYLE,
    model: stored?.model ?? "gpt-image-2.5-flare",
    quality: stored?.quality ?? "high",
    useReferences: stored?.useReferences ?? true,
    maxReferences: stored?.maxReferences ?? 3,
    references,
  };
}

/** How many style references a generation of each kind will attach. */
export function referenceCounts(settings: Settings): Record<StickerKind, number> {
  const counts = { badge: 0, title: 0, motif: 0, portrait: 0 };
  if (!settings.useReferences) return counts;
  for (const kind of Object.values(settings.references)) {
    if (kind !== "none") counts[kind] = Math.min(counts[kind] + 1, settings.maxReferences);
  }
  return counts;
}

/** A random pick of the reference stickers assigned to this kind (random, so no single one gets copied). */
export async function loadStyleReferences(
  settings: Settings,
  kind: StickerKind,
): Promise<{ name: string; data: Buffer }[]> {
  if (!settings.useReferences) return [];
  const files = Object.entries(settings.references)
    .filter(([, k]) => k === kind)
    .map(([file]) => file)
    .sort(() => Math.random() - 0.5)
    .slice(0, settings.maxReferences);
  return Promise.all(
    files.map(async (file) => ({ name: file, data: await readFile(path.join(REFERENCES_DIR, file)) })),
  );
}

export async function saveSettings(settings: Settings): Promise<Settings> {
  await writeJson(SETTINGS_FILE, settings);
  return getSettings();
}

export class NotFoundError extends Error {}
