"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import type { StickerKind } from "@/lib/types";
import { KIND_INFO, STICKER_KINDS } from "@/lib/types";
import { IMAGE_ACCEPT, imageRejection, MAX_IMAGE_MB } from "@/lib/upload";
import { ICON, UploadSimple, X } from "./icons";
import { Button, Card, ErrorNote, Spinner } from "./ui";

/** The chosen image and the blob URL showing it, which has to be released by hand. */
type Picked = { file: File; url: string };

/**
 * Turns one of your own images into a sticker.
 *
 * The type comes first, and nothing converts until it is picked: it decides the
 * layout and the format the image is redrawn into, and no two types would make
 * the same sticker out of the same image.
 */
export function ImageToSticker({
  onConvert,
}: {
  onConvert: (kind: StickerKind, file: File) => Promise<void>;
}) {
  const [kind, setKind] = useState<StickerKind | null>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const hintId = useId();

  // Released as the pick changes, in `show`; this one only catches the card
  // going away with an image still in it.
  const urlRef = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  function show(next: Picked | null) {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = next?.url ?? null;
    setPicked(next);
  }

  // Checked here as well as on the server, so a 40 Mo photo is refused on the
  // spot instead of after its upload.
  function pick(file: File | undefined) {
    if (!file) return;
    const rejection = imageRejection(file);
    setError(rejection);
    show(rejection ? null : { file, url: URL.createObjectURL(file) });
  }

  async function convert() {
    if (!kind || !picked) return;
    setBusy(true);
    setError(null);
    try {
      await onConvert(kind, picked.file);
      show(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const missing = !kind
    ? "Choisis d'abord le type de sticker."
    : !picked
      ? "Choisis une image."
      : null;

  return (
    <Card className="space-y-3 p-4 md:col-span-2">
      <h2 className="font-display flex items-center gap-1.5 text-lg font-semibold">
        <UploadSimple {...ICON} />
        Depuis une image
      </h2>
      <p className="text-sm text-ink-soft">
        Une photo, une capture, un dessin : choisis le type de sticker, puis l&apos;image. Elle est lue pour
        remplir la description et sert de référence pour la ressemblance — le sticker est redessiné dans ton
        style, l&apos;image n&apos;est jamais collée telle quelle.
      </p>

      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Type de sticker à créer">
        {STICKER_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            title={KIND_INFO[k].hint}
            onClick={() => setKind(k)}
            // Same chips as the sticker description, so "this one" looks the
            // same wherever a type is picked.
            className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${
              kind === k
                ? "border-action bg-action text-white"
                : "border-line bg-white text-ink-soft hover:text-ink"
            }`}
          >
            {KIND_INFO[k].emoji} {KIND_INFO[k].label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {picked && (
          <>
            <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-line">
              <Image src={picked.url} alt="" fill sizes="48px" unoptimized className="object-cover" />
            </span>
            <span className="max-w-40 truncate text-sm" title={picked.file.name}>
              {picked.file.name}
            </span>
            <button
              type="button"
              onClick={() => show(null)}
              disabled={busy}
              aria-label="Retirer l'image"
              className="text-ink-soft hover:text-danger"
            >
              <X {...ICON} />
            </button>
          </>
        )}
        <Button onClick={() => fileInput.current?.click()} disabled={busy}>
          <UploadSimple {...ICON} />
          {picked ? "Changer d'image" : "Choisir une image"}
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept={IMAGE_ACCEPT}
          hidden
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <span className="text-xs text-ink-soft">PNG, JPG ou WebP, {MAX_IMAGE_MB} Mo max.</span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {missing && (
            <p id={hintId} className="text-sm text-ink-soft">
              {missing}
            </p>
          )}
          <Button
            variant="primary"
            onClick={convert}
            disabled={busy || Boolean(missing)}
            aria-describedby={missing ? hintId : undefined}
          >
            {busy && <Spinner />}
            {busy ? "Lecture de l'image…" : "Convertir en sticker"}
          </Button>
        </div>
      </div>

      {error && <ErrorNote message={error} onClose={() => setError(null)} />}
    </Card>
  );
}
