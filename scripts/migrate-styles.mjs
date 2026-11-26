/**
 * Migration one-shot : des réglages globaux « Mon style » vers la bibliothèque de styles.
 *
 *   node scripts/migrate-styles.mjs [--dry-run]
 *
 * Elle fait trois choses :
 *   1. déplace les Exemples de référence de `references/` vers `references/pate-a-modeler/`,
 *      avec `git mv` pour ceux que git suit, afin que l'historique suive ;
 *   2. replie `data/settings.json` dans un premier style, « Pâte à modeler » ;
 *   3. estampille les albums et leurs versions déjà produites avec ce style.
 *
 * C'est un script et non une dérivation à la lecture, parce qu'elle déplace des
 * fichiers versionnés : le faire pendant un chargement de page serait
 * indéfendable. Voir docs/adr/0003-un-dossier-de-references-par-style.md.
 *
 * Elle est idempotente : relancée, elle ne refait que ce qui manque.
 */

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const REFERENCES_DIR = path.join(ROOT, "references");
const DATA_DIR = path.join(ROOT, "data");
const ALBUMS_DIR = path.join(DATA_DIR, "albums");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const STYLES_FILE = path.join(DATA_DIR, "styles.json");

const SEED_STYLE_ID = "pate-a-modeler";
const SEED_STYLE_NAME = "Pâte à modeler";

const IMAGE_EXT = /\.(png|jpe?g|webp)$/i;
const DRY = process.argv.includes("--dry-run");

const log = (message) => console.log(`${DRY ? "[dry-run] " : ""}${message}`);

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

async function writeJson(file, data) {
  if (DRY) return;
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

/** Les fichiers de `references/` que git suit, pour les déplacer avec leur historique. */
function trackedReferences() {
  try {
    return new Set(
      execFileSync("git", ["ls-files", "-z", "--", "references"], { encoding: "utf8" })
        .split("\0")
        .filter(Boolean)
        .map((p) => path.basename(p)),
    );
  } catch {
    log("git indisponible : tous les fichiers seront déplacés sans passer par git.");
    return new Set();
  }
}

/** 1. Les images de référence rejoignent le dossier du style. */
async function moveReferences() {
  let names;
  try {
    names = (await readdir(REFERENCES_DIR, { withFileTypes: true }))
      .filter((e) => e.isFile() && IMAGE_EXT.test(e.name))
      .map((e) => e.name);
  } catch {
    log("Aucun dossier references/ : rien à déplacer.");
    return;
  }
  if (names.length === 0) {
    log("Aucune image à la racine de references/ : déjà fait.");
    return;
  }

  const target = path.join(REFERENCES_DIR, SEED_STYLE_ID);
  if (!DRY) await mkdir(target, { recursive: true });
  const tracked = trackedReferences();

  for (const name of names.sort()) {
    const from = path.join(REFERENCES_DIR, name);
    const to = path.join(target, name);
    if (existsSync(to)) {
      log(`déjà présent, ignoré : ${name}`);
      continue;
    }
    if (tracked.has(name)) {
      log(`git mv : ${name}`);
      if (!DRY) execFileSync("git", ["mv", "--", from, to]);
    } else {
      log(`déplacé (non suivi par git) : ${name}`);
      if (!DRY) await rename(from, to);
    }
  }
  log(`${names.length} image(s) traitée(s) vers references/${SEED_STYLE_ID}/.`);
}

/** 2. Les anciens réglages deviennent le premier style. */
async function foldSettingsIntoLibrary() {
  if (await readJson(STYLES_FILE)) {
    log("data/styles.json existe déjà : la bibliothèque n'est pas touchée.");
    return;
  }
  const settings = await readJson(SETTINGS_FILE);
  if (!settings) {
    log("Aucun data/settings.json : l'app créera le style au premier lancement.");
    return;
  }

  const style = {
    id: SEED_STYLE_ID,
    name: SEED_STYLE_NAME,
    description: settings.style,
    model: settings.model ?? "gpt-image-2.5-flare",
    quality: settings.quality ?? "high",
    useReferences: settings.useReferences ?? true,
    maxReferences: settings.maxReferences ?? 3,
    // Les noms de fichiers ne changent pas en changeant de dossier.
    references: settings.references ?? {},
    createdAt: new Date().toISOString(),
  };
  await writeJson(STYLES_FILE, { defaultStyleId: SEED_STYLE_ID, styles: [style] });
  log(`data/styles.json écrit avec « ${SEED_STYLE_NAME} ».`);
  log("data/settings.json n'est plus lu ; il est laissé en place, à toi de le supprimer.");
}

/** 3. Les albums et leurs versions portent désormais le style qui les a produits. */
async function stampAlbums() {
  let ids;
  try {
    ids = await readdir(ALBUMS_DIR);
  } catch {
    log("Aucun album à estampiller.");
    return;
  }

  let albumsTouched = 0;
  let versionsTouched = 0;
  for (const id of ids) {
    const file = path.join(ALBUMS_DIR, id, "album.json");
    const album = await readJson(file);
    if (!album) continue;

    let changed = false;
    if (!album.styleId) {
      album.styleId = SEED_STYLE_ID;
      changed = true;
      albumsTouched++;
    }
    for (const sticker of album.stickers ?? []) {
      for (const version of sticker.versions ?? []) {
        if (!version.styleId) {
          // Exact au niveau de l'entité : il n'y a jamais eu qu'une seule
          // lignée de style, même si sa description a dérivé depuis.
          version.styleId = SEED_STYLE_ID;
          version.styleName = SEED_STYLE_NAME;
          changed = true;
          versionsTouched++;
        }
      }
    }
    if (changed) await writeJson(file, album);
  }
  log(`${albumsTouched} album(s) et ${versionsTouched} version(s) estampillés.`);
}

await moveReferences();
await foldSettingsIntoLibrary();
await stampAlbums();
log("Migration terminée.");
if (DRY) console.log("\nRien n'a été écrit. Relance sans --dry-run pour appliquer.");
