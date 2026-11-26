"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, referenceUrl } from "@/lib/client-api";
import type { ImageQuality, StickerKind, Style } from "@/lib/types";
import {
  IMAGE_MODELS,
  IMAGE_QUALITIES,
  KIND_INFO,
  MODEL_INFO,
  QUALITY_INFO,
  STICKER_KINDS,
} from "@/lib/types";
import { Button, Card, ConfirmButton, ErrorNote, Spinner } from "./ui";

// Built from the shared tables so this page and the album workspace cannot
// drift into calling the same model two different things.
const MODELS = IMAGE_MODELS.map((id) => ({ id, ...MODEL_INFO[id] }));
const QUALITIES = IMAGE_QUALITIES.map((id) => ({ id, label: QUALITY_INFO[id].label }));

export function StyleEditor({
  initial,
  folder,
  canDelete,
}: {
  initial: Style;
  /** Shown because a rename never moves it: the id is frozen at creation. */
  folder: string;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [style, setStyle] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(style) !== JSON.stringify(saved);

  function set<K extends keyof Style>(key: K, value: Style[K]) {
    setStyle((s) => ({ ...s, [key]: value }));
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const next = await api<Style>(`/api/styles/${style.id}`, { method: "PUT", json: style });
      setStyle(next);
      setSaved(next);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/styles/${style.id}`, { method: "DELETE" });
      router.push("/styles");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const references = Object.entries(style.references);
  const perKind = (kind: StickerKind) => references.filter(([, k]) => k === kind).length;

  return (
    <div className="space-y-6 pb-24">
      <Card className="space-y-3 p-5">
        <h2 className="font-display text-xl font-semibold">Nom</h2>
        <input className="field" value={style.name} onChange={(e) => set("name", e.target.value)} />
        <p className="text-xs text-ink-soft">
          Les images de ce style vivent dans <code>{folder}</code>. Ce dossier garde son nom même si
          tu renommes le style, pour ne pas réécrire les albums et les versions qui le citent.
        </p>
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="font-display text-xl font-semibold">Description du style</h2>
        <textarea
          className="field font-mono text-sm"
          rows={9}
          value={style.description}
          onChange={(e) => set("description", e.target.value)}
        />
        <p className="text-xs text-ink-soft">
          En anglais, les modèles d&apos;image le suivent un peu mieux. Cette description sert aussi
          à rédiger les suggestions d&apos;idées. Chaque type de sticker (badge, titre…) a en plus sa
          propre mise en page, visible dans « Prompt » sur chaque sticker.
        </p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3 p-5">
          <h2 className="font-display text-xl font-semibold">Modèle</h2>
          {MODELS.map((m) => (
            <label key={m.id} className="flex items-start gap-2">
              <input
                type="radio"
                name="model"
                className="mt-1 accent-action"
                checked={style.model === m.id}
                onChange={() => set("model", m.id)}
              />
              <span>
                <strong>{m.label}</strong> <span className="text-sm text-ink-soft">· {m.hint}</span>
              </span>
            </label>
          ))}
        </Card>
        <Card className="space-y-3 p-5">
          <h2 className="font-display text-xl font-semibold">Qualité de départ</h2>
          <select
            className="field"
            value={style.quality}
            onChange={(e) => set("quality", e.target.value as ImageQuality)}
          >
            {QUALITIES.map((q) => (
              <option key={q.id} value={q.id}>
                {q.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-ink-soft">
            La qualité est une question de coût, pas de style : celle-ci n&apos;est qu&apos;un point
            de départ, et l&apos;espace de travail de l&apos;album peut la changer le temps
            d&apos;une génération.
          </p>
        </Card>
      </div>

      <Card className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">Exemples de référence</h2>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              className="h-4 w-4 accent-action"
              checked={style.useReferences}
              onChange={(e) => set("useReferences", e.target.checked)}
            />
            Montrer des exemples au modèle
          </label>
        </div>
        <p className="text-sm text-ink-soft">
          À chaque génération, jusqu&apos;à{" "}
          <select
            className="rounded-md border border-line bg-white px-1"
            value={style.maxReferences}
            onChange={(e) => set("maxReferences", Number(e.target.value))}
            disabled={!style.useReferences}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>{" "}
          exemples du même type sont tirés au hasard et joints au prompt. C&apos;est ce qui garde le
          rendu cohérent d&apos;un sticker à l&apos;autre. Pour en ajouter, dépose des PNG dans{" "}
          <code>{folder}</code>.
        </p>
        <p className="flex flex-wrap gap-2 text-xs">
          {STICKER_KINDS.map((kind) => (
            <span key={kind} className="rounded-full bg-cream px-2 py-1">
              {KIND_INFO[kind].emoji} {KIND_INFO[kind].label} : {perKind(kind)}
            </span>
          ))}
        </p>
        {references.length === 0 ? (
          <p className="text-sm text-ink-soft">Aucune image trouvée dans {folder}.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {references.map(([file, kind], i) => (
              <li key={file} className={`space-y-1.5 ${kind === "none" ? "opacity-50" : ""}`}>
                {/* The alt used to be the raw filename, which a screen reader
                    read out as "ChatGPT Image 16 sept 2026 19_19_28.png". The
                    position in the grid is the only part of that which helps,
                    and it is what the select below is numbered by too. */}
                <div className="checker relative aspect-square overflow-hidden rounded-xl border border-line">
                  <Image
                    src={referenceUrl(style.id, file)}
                    alt={`Exemple de référence ${i + 1}`}
                    fill
                    sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 200px"
                    className="object-contain p-1"
                  />
                </div>
                <select
                  className="field py-1 text-xs"
                  aria-label={`Type de l'exemple ${i + 1}`}
                  value={kind}
                  onChange={(e) =>
                    set("references", {
                      ...style.references,
                      [file]: e.target.value as StickerKind | "none",
                    })
                  }
                >
                  {STICKER_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {KIND_INFO[k].emoji} {KIND_INFO[k].label}
                    </option>
                  ))}
                  <option value="none">Ne pas utiliser</option>
                </select>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {error && <ErrorNote message={error} onClose={() => setError(null)} />}

      <Card className="space-y-3 p-5">
        <h2 className="font-display text-xl font-semibold">Supprimer ce style</h2>
        {canDelete ? (
          <>
            <p className="text-sm text-ink-soft">
              Les albums qui s&apos;en servaient repassent au style par défaut. Les stickers déjà
              produits gardent son nom dans leur historique, et le dossier <code>{folder}</code>{" "}
              reste sur le disque : l&apos;app ne supprime pas des images que tu as choisies à la
              main.
            </p>
            <ConfirmButton
              label="Supprimer le style"
              question={`« ${saved.name} » ? Son dossier d'images restera.`}
              confirmLabel="Supprimer"
              onConfirm={remove}
            />
          </>
        ) : (
          <p className="text-sm text-ink-soft">
            C&apos;est ton seul style : la bibliothèque ne peut pas être vide. Crée-en un autre
            d&apos;abord.
          </p>
        )}
      </Card>

      {dirty && (
        <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
          <div className="on-dark flex items-center gap-3 rounded-full bg-navy py-2 pl-5 pr-2 text-white shadow-xl">
            <span className="text-sm">Modifications non enregistrées</span>
            <Button
              variant="ghost"
              className="text-white/80 hover:bg-white/10 hover:text-white"
              onClick={() => setStyle(saved)}
            >
              Annuler
            </Button>
            <Button variant="primary" onClick={save} disabled={busy}>
              {busy && <Spinner />} Enregistrer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
