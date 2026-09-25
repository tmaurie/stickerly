"use client";

import { useEffect, useState } from "react";
import { imageUrl } from "@/lib/client-api";
import { ADJUST_SUGGESTIONS, buildPrompt } from "@/lib/prompt";
import { stickerFileName } from "@/lib/slug";
import type { StickerPatch } from "@/lib/sticker-draft";
import type { Sticker, StickerKind } from "@/lib/types";
import { currentVersion, KIND_INFO } from "@/lib/types";
import { ArrowsClockwise, DownloadSimple, ICON, PencilSimple, Star } from "./icons";
import { StickerFields } from "./StickerFields";
import { Button, ErrorNote } from "./ui";

export type JobState = { status: "queued" | "running"; startedAt: number; instruction?: string };

type Panel = "adjust" | "edit" | "prompt" | null;

export function StickerCard({
  albumId,
  index,
  sticker,
  theme,
  style,
  refCounts,
  job,
  error,
  uploading,
  onChange,
  onGenerate,
  onAddPhotos,
  onRemovePhoto,
  onDelete,
  onDismissError,
}: {
  albumId: string;
  index: number;
  sticker: Sticker;
  theme: string;
  style: string;
  refCounts: Record<StickerKind, number>;
  job?: JobState;
  error?: string;
  uploading: boolean;
  onChange: (patch: StickerPatch) => void;
  onGenerate: (instruction?: string) => void;
  onAddPhotos: (files: File[]) => void;
  onRemovePhoto: (file: string) => void;
  onDelete: () => void;
  onDismissError: () => void;
}) {
  const [panel, setPanel] = useState<Panel>(null);
  const [instruction, setInstruction] = useState("");
  const version = currentVersion(sticker);
  const info = KIND_INFO[sticker.kind];
  const label = sticker.text || sticker.subject || info.label;
  const busy = Boolean(job);

  const autoPrompt = buildPrompt(sticker, {
    style,
    theme,
    styleRefCount: refCounts[sticker.kind],
    photoCount: sticker.photos.length,
  });
  const [promptDraft, setPromptDraft] = useState(sticker.promptOverride ?? autoPrompt);

  function toggle(next: Panel) {
    setPanel((p) => (p === next ? null : next));
    if (next === "prompt") setPromptDraft(sticker.promptOverride ?? autoPrompt);
  }

  function adjust(text: string) {
    if (!text.trim()) return;
    onGenerate(text.trim());
    setInstruction("");
    setPanel(null);
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-blob border border-line bg-white shadow-sm">
      <div className={`checker relative ${sticker.kind === "title" ? "aspect-[3/1.4]" : "aspect-square"}`}>
        {version && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl(albumId, version.file)}
            alt={label}
            className={`h-full w-full object-contain p-2 transition ${busy ? "opacity-40 blur-[1px]" : ""}`}
          />
        )}
        {job && <GeneratingOverlay job={job} />}
        <button
          type="button"
          onClick={() => onChange({ favorite: !sticker.favorite })}
          className={`absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full shadow transition ${
            sticker.favorite ? "bg-action text-white" : "bg-white/90 text-ink-soft hover:text-action"
          }`}
          aria-pressed={sticker.favorite}
          aria-label={sticker.favorite ? "Retirer des favoris" : "Garder (favori)"}
          title={sticker.favorite ? "Retirer des favoris" : "Garder (favori)"}
        >
          <Star {...ICON} weight={sticker.favorite ? "fill" : "bold"} />
        </button>
        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-ink-soft shadow">
          {info.emoji} {info.label}
        </span>
      </div>

      {sticker.versions.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto border-t border-line px-3 py-2">
          {sticker.versions.map((v, i) => (
            <button
              key={v.id}
              type="button"
              onClick={() => onChange({ currentVersionId: v.id })}
              title={v.instruction ? `V${i + 1} : ${v.instruction}` : `Version ${i + 1}`}
              className={`checker h-11 w-11 shrink-0 overflow-hidden rounded-lg border-2 ${
                v.id === version?.id ? "border-action" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl(albumId, v.file)} alt={`Version ${i + 1}`} className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="font-display text-lg font-semibold leading-snug">{label}</h3>
          {sticker.text && <p className="line-clamp-2 text-sm text-ink-soft">{sticker.subject}</p>}
          {version?.instruction && (
            <p className="mt-1 text-xs text-sage">Retouche : « {version.instruction} »</p>
          )}
        </div>

        {error && <ErrorNote message={error} onClose={onDismissError} />}

        <div className="mt-auto flex flex-wrap gap-1.5">
          <Button size="sm" variant="primary" disabled={busy} onClick={() => onGenerate()} title="Même description, nouvelle image">
            <ArrowsClockwise {...ICON} />
            Autre version
          </Button>
          <Button size="sm" disabled={busy || !version} onClick={() => toggle("adjust")} aria-expanded={panel === "adjust"}>
            <PencilSimple {...ICON} />
            Ajuster
          </Button>
          <Button size="sm" variant="ghost" onClick={() => toggle("edit")} aria-expanded={panel === "edit"}>
            Description
          </Button>
          <Button size="sm" variant="ghost" onClick={() => toggle("prompt")} aria-expanded={panel === "prompt"}>
            Prompt{sticker.promptOverride ? " •" : ""}
          </Button>
          {version && (
            <a
              href={imageUrl(albumId, version.file, stickerFileName(index, label))}
              className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold text-ink-soft hover:bg-cream hover:text-ink"
              aria-label="Télécharger le PNG"
              title="Télécharger le PNG"
            >
              <DownloadSimple {...ICON} />
            </a>
          )}
        </div>

        {panel === "adjust" && (
          <div className="space-y-2 rounded-xl bg-cream p-3">
            <p className="text-sm font-semibold">Qu&apos;est-ce qu&apos;on change ?</p>
            <div className="flex flex-wrap gap-1.5">
              {ADJUST_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => adjust(s)}
                  className="rounded-full border border-line bg-white px-2.5 py-1 text-xs font-semibold hover:border-action hover:text-action"
                >
                  {s}
                </button>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                adjust(instruction);
              }}
            >
              <input
                className="field"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Ex. : mets la Vespa en vert d'eau"
                autoFocus
              />
              <Button type="submit" variant="primary" size="sm" disabled={!instruction.trim()}>
                OK
              </Button>
            </form>
          </div>
        )}

        {panel === "edit" && (
          <div className="space-y-3 rounded-xl bg-cream p-3">
            <StickerFields
              albumId={albumId}
              sticker={sticker}
              onChange={onChange}
              onAddPhotos={onAddPhotos}
              onRemovePhoto={onRemovePhoto}
              uploading={uploading}
            />
            <div className="flex justify-between">
              <Button size="sm" variant="danger" onClick={onDelete}>
                Supprimer le sticker
              </Button>
              <Button
                size="sm"
                variant="primary"
                disabled={busy}
                onClick={() => {
                  onGenerate();
                  setPanel(null);
                }}
              >
                Régénérer avec ces changements
              </Button>
            </div>
          </div>
        )}

        {panel === "prompt" && (
          <div className="space-y-2 rounded-xl bg-cream p-3">
            <p className="text-xs text-ink-soft">
              {sticker.promptOverride
                ? "Prompt personnalisé : il remplace le prompt automatique pour ce sticker."
                : "Prompt construit automatiquement à partir de la description et de ton style. Tu peux le modifier pour ce sticker."}
            </p>
            <textarea
              className="field font-mono text-xs"
              rows={12}
              value={promptDraft}
              onChange={(e) => setPromptDraft(e.target.value)}
            />
            <div className="flex flex-wrap justify-end gap-1.5">
              {sticker.promptOverride && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    onChange({ promptOverride: null });
                    setPromptDraft(autoPrompt);
                  }}
                >
                  Revenir à l&apos;automatique
                </Button>
              )}
              <Button
                size="sm"
                variant="primary"
                disabled={busy || promptDraft.trim() === (sticker.promptOverride ?? autoPrompt).trim()}
                onClick={() => {
                  onChange({ promptOverride: promptDraft });
                  onGenerate();
                  setPanel(null);
                }}
              >
                Générer avec ce prompt
              </Button>
            </div>
            {version && (
              <details className="text-xs">
                <summary className="cursor-pointer font-semibold text-ink-soft">
                  Prompt de la version affichée
                  {version.costUsd ? ` · ≈ ${version.costUsd.toFixed(2)} $` : ""}
                </summary>
                <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-white p-2 font-mono">{version.prompt}</pre>
              </details>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

const MESSAGES = ["On pétrit la pâte…", "Modelage en cours…", "On arrondit les angles…", "Petit coup de four…"];

function GeneratingOverlay({ job }: { job: JobState }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.round((now - job.startedAt) / 1000));
  const message = job.status === "queued" ? "En file d'attente…" : MESSAGES[Math.floor(seconds / 8) % MESSAGES.length];

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
      <span className="animate-squish h-10 w-10 rounded-full bg-terracotta shadow-[inset_-4px_-6px_0_rgba(0,0,0,0.12)]" />
      <span className="rounded-full bg-white/90 px-3 py-1 text-sm font-semibold shadow">
        {message} {job.status === "running" && <span className="text-ink-soft">{seconds}s</span>}
      </span>
      {job.instruction && <span className="max-w-[80%] text-xs text-ink-soft">« {job.instruction} »</span>}
    </div>
  );
}
