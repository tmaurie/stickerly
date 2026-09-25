"use client";

import { useRef } from "react";
import { photoUrl } from "@/lib/client-api";
import type { StickerPatch } from "@/lib/sticker-draft";
import type { Sticker } from "@/lib/types";
import { KIND_INFO, STICKER_KINDS } from "@/lib/types";
import { Camera, ICON, X } from "./icons";
import { Spinner } from "./ui";

export function StickerFields({
  albumId,
  sticker,
  onChange,
  onAddPhotos,
  onRemovePhoto,
  uploading,
}: {
  albumId: string;
  sticker: Sticker;
  onChange: (patch: StickerPatch) => void;
  onAddPhotos: (files: File[]) => void;
  onRemovePhoto: (file: string) => void;
  uploading: boolean;
}) {
  const info = KIND_INFO[sticker.kind];
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Type de sticker">
        {STICKER_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            role="radio"
            aria-checked={sticker.kind === kind}
            title={KIND_INFO[kind].hint}
            onClick={() => onChange({ kind })}
            className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${
              sticker.kind === kind
                ? "border-navy bg-navy text-white"
                : "border-line bg-white text-ink-soft hover:text-ink"
            }`}
          >
            {KIND_INFO[kind].emoji} {KIND_INFO[kind].label}
          </button>
        ))}
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-semibold">{info.textLabel}</span>
        <input
          className="field font-display text-lg"
          value={sticker.text}
          placeholder={info.textPlaceholder || "Aucun texte"}
          onChange={(e) => onChange({ text: e.target.value })}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-semibold">Sujet : ce qu&apos;il faut dessiner</span>
        <textarea
          className="field"
          rows={2}
          value={sticker.subject}
          placeholder={info.subjectPlaceholder}
          onChange={(e) => onChange({ subject: e.target.value })}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-semibold">
          Détails <span className="font-normal text-ink-soft">(déco, couleurs, style des lettres…)</span>
        </span>
        <textarea
          className="field"
          rows={2}
          value={sticker.details}
          placeholder={info.detailsPlaceholder}
          onChange={(e) => onChange({ details: e.target.value })}
        />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            className="h-4 w-4 accent-action"
            checked={sticker.outline}
            onChange={(e) => onChange({ outline: e.target.checked })}
          />
          Contour blanc découpé
        </label>

        <div className="flex items-center gap-2">
          {sticker.photos.map((file) => (
            <span key={file} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl(albumId, file)} alt="" className="h-10 w-10 rounded-lg object-cover" />
              <button
                type="button"
                onClick={() => onRemovePhoto(file)}
                className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-ink text-white group-hover:flex"
                aria-label="Retirer la photo"
              >
                <X size={12} weight="bold" aria-hidden />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-full border border-dashed border-ink-soft/40 px-3 py-1 text-sm text-ink-soft hover:border-action hover:text-action"
            title="Une photo aide à reproduire un visage, un lieu ou un objet précis"
          >
            {uploading ? <Spinner /> : <Camera {...ICON} />} Photo de référence
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            hidden
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length) onAddPhotos(files);
              e.target.value = "";
            }}
          />
        </div>
      </div>
      {sticker.kind === "portrait" && sticker.photos.length === 0 && (
        <p className="text-xs text-ink-soft">
          Astuce : ajoute une photo des personnes pour que les figurines leur ressemblent.
        </p>
      )}
      {sticker.photos.length > 0 && (
        <p className="text-xs text-ink-soft">
          La photo sert à la ressemblance (visage, cheveux, lunettes…). Pour une autre tenue, une autre pose ou
          d&apos;autres accessoires, décris-les dans le sujet ou les détails : ta description passe avant la photo.
        </p>
      )}
    </div>
  );
}
