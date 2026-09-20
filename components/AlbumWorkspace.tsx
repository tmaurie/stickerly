"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client-api";
import type { StickerPatch } from "@/lib/sticker-draft";
import type { Album, Sticker, StickerKind } from "@/lib/types";
import { KIND_INFO, STICKER_KINDS } from "@/lib/types";
import { StickerCard, type JobState } from "./StickerCard";
import { StickerFields } from "./StickerFields";
import { Button, Card, ErrorNote, Spinner } from "./ui";

type Step = "theme" | "ideas" | "stickers" | "export";

const MAX_PARALLEL = 3;
const SAVE_DELAY = 600;

function draftOf(s: Sticker): StickerPatch {
  return {
    kind: s.kind,
    text: s.text,
    subject: s.subject,
    details: s.details,
    outline: s.outline,
    promptOverride: s.promptOverride ?? null,
  };
}

export function AlbumWorkspace({
  initialAlbum,
  style,
  refCounts,
  imageSettings,
}: {
  initialAlbum: Album;
  style: string;
  refCounts: Record<StickerKind, number>;
  imageSettings: string;
}) {
  const router = useRouter();
  const [album, setAlbumState] = useState(initialAlbum);
  // Always holds the latest album, so queued jobs read fresh edits.
  const albumRef = useRef(initialAlbum);
  const [step, setStep] = useState<Step>(() => {
    if (initialAlbum.stickers.some((s) => s.versions.length)) return "stickers";
    return initialAlbum.theme.trim() ? "ideas" : "theme";
  });
  const [jobs, setJobs] = useState<Record<string, JobState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [globalError, setGlobalError] = useState<string | null>(null);

  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const queue = useRef<(() => Promise<void>)[]>([]);
  const running = useRef(0);

  function setAlbum(update: (a: Album) => Album) {
    albumRef.current = update(albumRef.current);
    setAlbumState(albumRef.current);
  }

  function replaceSticker(id: string, update: (s: Sticker) => Sticker) {
    setAlbum((a) => ({ ...a, stickers: a.stickers.map((s) => (s.id === id ? update(s) : s)) }));
  }

  function setError(id: string, message: string | null) {
    setErrors((errs) => {
      const next = { ...errs };
      if (message) next[id] = message;
      else delete next[id];
      return next;
    });
  }

  /* ---------- Sticker edits ---------- */

  function saveNow(id: string) {
    clearTimeout(saveTimers.current.get(id));
    saveTimers.current.delete(id);
    const sticker = albumRef.current.stickers.find((s) => s.id === id);
    if (!sticker) return;
    api(`/api/albums/${albumRef.current.id}/stickers/${id}`, {
      method: "PATCH",
      keepalive: true,
      json: { ...draftOf(sticker), favorite: sticker.favorite, currentVersionId: sticker.currentVersionId },
    }).catch((err: Error) => setError(id, err.message));
  }

  // Don't lose edits typed less than SAVE_DELAY before leaving the page.
  const saveNowRef = useRef(saveNow);
  useEffect(() => {
    saveNowRef.current = saveNow;
  });
  useEffect(() => {
    const timers = saveTimers.current;
    const flush = () => [...timers.keys()].forEach((id) => saveNowRef.current(id));
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  function updateSticker(id: string, patch: StickerPatch) {
    replaceSticker(id, (s) => {
      const next = { ...s, ...patch } as Sticker;
      if (patch.promptOverride === null) delete next.promptOverride;
      return next;
    });

    // Favorites and version picks are saved right away, text fields after a short pause.
    if ("favorite" in patch || "currentVersionId" in patch) {
      saveNow(id);
    } else {
      clearTimeout(saveTimers.current.get(id));
      saveTimers.current.set(
        id,
        setTimeout(() => saveNow(id), SAVE_DELAY),
      );
    }
  }

  async function addSticker(kind: StickerKind) {
    try {
      const sticker = await api<Sticker>(`/api/albums/${album.id}/stickers`, { method: "POST", json: { kind } });
      setAlbum((a) => ({ ...a, stickers: [...a.stickers, sticker] }));
      setSelected((sel) => new Set(sel).add(sticker.id));
    } catch (err) {
      setGlobalError((err as Error).message);
    }
  }

  async function deleteSticker(id: string) {
    const sticker = albumRef.current.stickers.find((s) => s.id === id);
    if (sticker?.versions.length && !confirm("Supprimer ce sticker et toutes ses versions ?")) return;
    clearTimeout(saveTimers.current.get(id));
    saveTimers.current.delete(id);
    setAlbum((a) => ({ ...a, stickers: a.stickers.filter((s) => s.id !== id) }));
    setSelected((sel) => {
      const next = new Set(sel);
      next.delete(id);
      return next;
    });
    await api(`/api/albums/${album.id}/stickers/${id}`, { method: "DELETE" }).catch((err: Error) =>
      setGlobalError(err.message),
    );
  }

  async function addPhotos(id: string, files: File[]) {
    setUploading((u) => ({ ...u, [id]: true }));
    try {
      const form = new FormData();
      files.forEach((f) => form.append("photos", f));
      const updated = await api<Sticker>(`/api/albums/${album.id}/stickers/${id}/photos`, {
        method: "POST",
        body: form,
      });
      replaceSticker(id, (s) => ({ ...s, photos: updated.photos }));
    } catch (err) {
      setError(id, (err as Error).message);
    } finally {
      setUploading((u) => ({ ...u, [id]: false }));
    }
  }

  async function removePhoto(id: string, file: string) {
    replaceSticker(id, (s) => ({ ...s, photos: s.photos.filter((p) => p !== file) }));
    await api(`/api/albums/${album.id}/stickers/${id}/photos?file=${encodeURIComponent(file)}`, {
      method: "DELETE",
    }).catch((err: Error) => setError(id, err.message));
  }

  /* ---------- Generation queue ---------- */

  function pump() {
    while (running.current < MAX_PARALLEL && queue.current.length) {
      const job = queue.current.shift()!;
      running.current++;
      job().finally(() => {
        running.current--;
        pump();
      });
    }
  }

  function generate(id: string, instruction?: string) {
    setError(id, null);
    setJobs((j) => ({ ...j, [id]: { status: "queued", startedAt: Date.now(), instruction } }));
    queue.current.push(async () => {
      setJobs((j) => ({ ...j, [id]: { status: "running", startedAt: Date.now(), instruction } }));
      try {
        const sticker = albumRef.current.stickers.find((s) => s.id === id);
        if (!sticker) return;
        // The generate call saves the latest edits itself.
        clearTimeout(saveTimers.current.get(id));
        saveTimers.current.delete(id);
        const updated = await api<Sticker>(`/api/albums/${album.id}/stickers/${id}/generate`, {
          method: "POST",
          json: { draft: draftOf(sticker), instruction },
        });
        replaceSticker(id, (s) => ({
          ...s,
          versions: updated.versions,
          currentVersionId: updated.currentVersionId,
        }));
      } catch (err) {
        setError(id, (err as Error).message);
      } finally {
        setJobs((j) => {
          const next = { ...j };
          delete next[id];
          return next;
        });
      }
    });
    pump();
  }

  function generateSelected() {
    const ids = ideas.filter((s) => selected.has(s.id)).map((s) => s.id);
    ids.forEach((id) => generate(id));
    setSelected(new Set());
    setStep("stickers");
  }

  /* ---------- Derived lists ---------- */

  const ideas = album.stickers.filter((s) => s.versions.length === 0 && !jobs[s.id]);
  const made = album.stickers.filter((s) => s.versions.length > 0 || jobs[s.id]);
  const favorites = album.stickers.filter((s) => s.favorite && s.versions.length > 0);
  const selectedIdeas = ideas.filter((s) => selected.has(s.id));
  const runningCount = Object.keys(jobs).length;

  const steps: { id: Step; label: string; count?: number }[] = [
    { id: "theme", label: "Thème" },
    { id: "ideas", label: "Idées", count: ideas.length },
    { id: "stickers", label: "Stickers", count: made.length },
    { id: "export", label: "Export", count: favorites.length },
  ];

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/" className="text-sm font-semibold text-ink-soft hover:text-terracotta">
            ← Mes albums
          </Link>
          <h1 className="font-display text-3xl font-semibold text-navy">{album.name}</h1>
        </div>
        {runningCount > 0 && (
          <span className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-semibold shadow-sm">
            <Spinner className="text-terracotta" /> {runningCount} en cours
          </span>
        )}
      </div>

      <nav className="grid grid-cols-4 gap-1 rounded-full bg-white p-1 shadow-sm" aria-label="Étapes">
        {steps.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStep(s.id)}
            aria-current={step === s.id ? "step" : undefined}
            className={`flex items-center justify-center gap-2 rounded-full px-2 py-2 text-sm font-semibold transition ${
              step === s.id ? "bg-navy text-white" : "text-ink-soft hover:bg-cream"
            }`}
          >
            <span className="font-display hidden sm:inline">{i + 1}.</span> {s.label}
            {s.count ? (
              <span
                className={`rounded-full px-1.5 text-xs ${step === s.id ? "bg-white/20" : "bg-sage-soft text-sage"}`}
              >
                {s.count}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {globalError && <ErrorNote message={globalError} onClose={() => setGlobalError(null)} />}

      {step === "theme" && (
        <ThemeStep
          album={album}
          onSaved={(a) => {
            setAlbum((prev) => ({ ...prev, name: a.name, theme: a.theme }));
            setStep("ideas");
          }}
          onDelete={async () => {
            if (!confirm(`Supprimer l'album « ${album.name} » et tous ses stickers ?`)) return;
            await api(`/api/albums/${album.id}`, { method: "DELETE" });
            router.push("/");
            router.refresh();
          }}
        />
      )}

      {step === "ideas" && (
        <div className="space-y-4">
          <IdeaGenerator
            albumId={album.id}
            hasTheme={Boolean(album.theme.trim())}
            onIdeas={(stickers) => {
              setAlbum((a) => ({ ...a, stickers: [...a.stickers, ...stickers] }));
              setSelected((sel) => new Set([...sel, ...stickers.map((s) => s.id)]));
            }}
            onAdd={addSticker}
          />

          {ideas.length === 0 ? (
            <p className="py-8 text-center text-ink-soft">
              Pas d&apos;idée en attente. Demande des suggestions ou ajoute un sticker à la main.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-ink-soft">
                  Coche les idées à générer, retouche-les si besoin.
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setSelected(selectedIdeas.length === ideas.length ? new Set() : new Set(ideas.map((s) => s.id)))
                  }
                >
                  {selectedIdeas.length === ideas.length ? "Tout décocher" : "Tout cocher"}
                </Button>
              </div>
              <ul className="grid gap-3 lg:grid-cols-2">
                {ideas.map((sticker) => (
                  <li key={sticker.id}>
                    <Card
                      className={`p-4 transition ${selected.has(sticker.id) ? "border-terracotta ring-2 ring-terracotta/20" : ""}`}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm font-semibold">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-terracotta"
                            checked={selected.has(sticker.id)}
                            onChange={(e) =>
                              setSelected((sel) => {
                                const next = new Set(sel);
                                if (e.target.checked) next.add(sticker.id);
                                else next.delete(sticker.id);
                                return next;
                              })
                            }
                          />
                          À générer
                        </label>
                        <Button size="sm" variant="danger" onClick={() => deleteSticker(sticker.id)}>
                          Retirer
                        </Button>
                      </div>
                      <StickerFields
                        albumId={album.id}
                        sticker={sticker}
                        onChange={(patch) => updateSticker(sticker.id, patch)}
                        onAddPhotos={(files) => addPhotos(sticker.id, files)}
                        onRemovePhoto={(file) => removePhoto(sticker.id, file)}
                        uploading={Boolean(uploading[sticker.id])}
                      />
                      {errors[sticker.id] && (
                        <div className="mt-3">
                          <ErrorNote message={errors[sticker.id]} onClose={() => setError(sticker.id, null)} />
                        </div>
                      )}
                    </Card>
                  </li>
                ))}
              </ul>
            </>
          )}

          {selectedIdeas.length > 0 && (
            <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
              <div className="flex items-center gap-4 rounded-full bg-navy py-2 pl-5 pr-2 text-white shadow-xl">
                <span className="text-sm">
                  {selectedIdeas.length} idée{selectedIdeas.length > 1 ? "s" : ""} sélectionnée
                  {selectedIdeas.length > 1 ? "s" : ""}
                </span>
                <Button variant="primary" onClick={generateSelected}>
                  Générer →
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {step === "stickers" &&
        (made.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-ink-soft">Aucun sticker généré pour l&apos;instant.</p>
            <Button className="mt-3" variant="primary" onClick={() => setStep("ideas")}>
              Choisir des idées
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-ink-soft">
              Mets une étoile aux stickers à garder. Génération : {imageSettings}.{" "}
              <Link href="/style" className="underline hover:text-terracotta">
                Modifier
              </Link>
            </p>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {made.map((sticker) => (
                <li key={sticker.id}>
                  <StickerCard
                    albumId={album.id}
                    index={album.stickers.indexOf(sticker)}
                    sticker={sticker}
                    theme={album.theme}
                    style={style}
                    refCounts={refCounts}
                    job={jobs[sticker.id]}
                    error={errors[sticker.id]}
                    uploading={Boolean(uploading[sticker.id])}
                    onChange={(patch) => updateSticker(sticker.id, patch)}
                    onGenerate={(instruction) => generate(sticker.id, instruction)}
                    onAddPhotos={(files) => addPhotos(sticker.id, files)}
                    onRemovePhoto={(file) => removePhoto(sticker.id, file)}
                    onDelete={() => deleteSticker(sticker.id)}
                    onDismissError={() => setError(sticker.id, null)}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}

      {step === "export" && <ExportStep album={album} favorites={favorites.length} />}
    </div>
  );
}

/* ---------- Step 1: theme ---------- */

function ThemeStep({
  album,
  onSaved,
  onDelete,
}: {
  album: Album;
  onSaved: (album: Album) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(album.name);
  const [theme, setTheme] = useState(album.theme);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      onSaved(await api<Album>(`/api/albums/${album.id}`, { method: "PATCH", json: { name, theme } }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="max-w-3xl space-y-4 p-5">
      <label className="block space-y-1">
        <span className="text-sm font-semibold">Nom de l&apos;album</span>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-semibold">Thème et contexte</span>
        <textarea
          className="field"
          rows={7}
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="Où, quand, avec qui ? Les lieux visités, les moments forts, les plats, les petites anecdotes… Décris aussi les personnes (cheveux, lunettes…) si tu veux des stickers de personnages."
        />
      </label>
      {error && <ErrorNote message={error} />}
      <div className="flex justify-between">
        <Button variant="danger" size="sm" onClick={onDelete}>
          Supprimer l&apos;album
        </Button>
        <Button variant="primary" onClick={save} disabled={busy || !name.trim()}>
          {busy && <Spinner />} Enregistrer et passer aux idées →
        </Button>
      </div>
    </Card>
  );
}

/* ---------- Step 2: ideas ---------- */

function IdeaGenerator({
  albumId,
  hasTheme,
  onIdeas,
  onAdd,
}: {
  albumId: string;
  hasTheme: boolean;
  onIdeas: (stickers: Sticker[]) => void;
  onAdd: (kind: StickerKind) => void;
}) {
  const [count, setCount] = useState(6);
  const [focus, setFocus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function suggest() {
    setBusy(true);
    setError(null);
    try {
      onIdeas(await api<Sticker[]>(`/api/albums/${albumId}/ideas`, { method: "POST", json: { count, focus } }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
      <Card className="space-y-3 p-4">
        <h2 className="font-display text-lg font-semibold">✨ Suggestions</h2>
        {!hasTheme && (
          <p className="text-sm text-ink-soft">
            Astuce : remplis le thème de l&apos;album (étape 1) pour des idées bien plus précises.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <input
            className="field min-w-48 flex-1"
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="Une envie ? ex. « surtout des titres drôles »"
          />
          <select className="field w-auto" value={count} onChange={(e) => setCount(Number(e.target.value))}>
            {[3, 6, 8, 12].map((n) => (
              <option key={n} value={n}>
                {n} idées
              </option>
            ))}
          </select>
          <Button variant="primary" onClick={suggest} disabled={busy}>
            {busy && <Spinner />} Proposer
          </Button>
        </div>
        {error && <ErrorNote message={error} onClose={() => setError(null)} />}
      </Card>
      <Card className="space-y-3 p-4">
        <h2 className="font-display text-lg font-semibold">➕ À la main</h2>
        <div className="grid grid-cols-2 gap-1.5">
          {STICKER_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => onAdd(kind)}
              title={KIND_INFO[kind].hint}
              className="rounded-xl border border-line bg-cream px-2 py-2 text-left text-sm font-semibold hover:border-terracotta"
            >
              {KIND_INFO[kind].emoji} {KIND_INFO[kind].label}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ---------- Step 4: export ---------- */

function ExportStep({ album, favorites }: { album: Album; favorites: number }) {
  const generated = album.stickers.filter((s) => s.versions.length > 0).length;
  const cost = album.stickers
    .flatMap((s) => s.versions)
    .reduce((sum, v) => sum + (v.costUsd ?? 0), 0);

  return (
    <Card className="max-w-3xl space-y-4 p-5">
      <h2 className="font-display text-xl font-semibold">Télécharger</h2>
      <p className="text-sm text-ink-soft">
        Tu récupères la version affichée de chaque sticker, en PNG à fond transparent, prête à poser dans ton
        logiciel d&apos;album photo ou à imprimer sur du papier autocollant.
      </p>
      <div className="flex flex-wrap gap-2">
        {favorites > 0 ? (
          <a
            href={`/api/albums/${album.id}/export?scope=favorites`}
            className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-4 py-2 font-semibold text-white shadow-[0_3px_0_var(--color-terracotta-dark)]"
          >
            ★ Mes {favorites} favoris (.zip)
          </a>
        ) : (
          <span className="rounded-full bg-cream px-4 py-2 text-sm text-ink-soft">
            Aucun favori : mets une étoile aux stickers à garder.
          </span>
        )}
        {generated > 0 && (
          <a
            href={`/api/albums/${album.id}/export`}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 font-semibold"
          >
            Tous les stickers ({generated}) (.zip)
          </a>
        )}
      </div>
      {cost > 0 && (
        <p className="text-xs text-ink-soft">Coût estimé des générations de cet album : ≈ {cost.toFixed(2)} $</p>
      )}
    </Card>
  );
}
