"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, referenceUrl } from "@/lib/client-api";
import type { Style, StyleLibrary as Library } from "@/lib/types";
import { MODEL_INFO, QUALITY_INFO } from "@/lib/types";
import { ICON, Plus, Star } from "./icons";
import { Button, Card, ErrorNote, Spinner } from "./ui";

export function StyleLibrary({ initial }: { initial: Library }) {
  const router = useRouter();
  const [library, setLibrary] = useState(initial);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(work: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await work();
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const setDefault = (defaultStyleId: string) =>
    run(async () => {
      setLibrary(await api<Library>("/api/styles", { method: "PUT", json: { defaultStyleId } }));
    });

  const create = (payload: { name: string; from?: string }) =>
    run(async () => {
      const style = await api<Style>("/api/styles", { method: "POST", json: payload });
      setName("");
      router.push(`/styles/${style.id}`);
    });

  return (
    <div className="space-y-6 pb-12">
      <ul className="grid gap-4 md:grid-cols-2">
        {library.styles.map((style) => {
          // The images it holds, not referenceCounts: that one is capped per kind,
          // since it answers how many a generation attaches, not how many exist.
          const total = Object.values(style.references).filter((k) => k !== "none").length;
          const thumbs = Object.entries(style.references)
            .filter(([, kind]) => kind !== "none")
            .slice(0, 3)
            .map(([file]) => file);
          const isDefault = style.id === library.defaultStyleId;

          return (
            <li key={style.id}>
              <Card className="flex h-full flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg font-semibold leading-snug">
                      <Link href={`/styles/${style.id}`} className="hover:text-action">
                        {style.name}
                      </Link>
                    </h2>
                    <p className="text-sm text-ink-soft">
                      {MODEL_INFO[style.model].label} · qualité {QUALITY_INFO[style.quality].short} ·{" "}
                      {style.useReferences
                        ? `${total} exemple${total > 1 ? "s" : ""}, ${style.maxReferences} par génération`
                        : "exemples désactivés"}
                    </p>
                  </div>
                  {isDefault && (
                    <span className="flex items-center gap-1 whitespace-nowrap rounded-full bg-sage-soft px-2 py-1 text-xs font-semibold text-sage">
                      <Star {...ICON} size={12} weight="fill" />
                      Par défaut
                    </span>
                  )}
                </div>

                {thumbs.length > 0 && (
                  <ul className="flex gap-2">
                    {thumbs.map((file, i) => (
                      <li
                        key={file}
                        className="checker relative h-16 w-16 overflow-hidden rounded-xl border border-line"
                      >
                        <Image
                          src={referenceUrl(style.id, file)}
                          alt={`Exemple ${i + 1} du style ${style.name}`}
                          fill
                          sizes="64px"
                          className="object-contain p-1"
                        />
                      </li>
                    ))}
                  </ul>
                )}

                <p className="line-clamp-3 text-xs text-ink-soft">{style.description}</p>

                <div className="mt-auto flex flex-wrap gap-1.5">
                  <Link
                    href={`/styles/${style.id}`}
                    className="rounded-full px-3 py-1.5 text-sm font-semibold text-ink-soft hover:bg-cream hover:text-ink"
                  >
                    Modifier
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => create({ name: `${style.name} (copie)`, from: style.id })}
                    title="Copie la description, les réglages et les images de référence"
                  >
                    Dupliquer
                  </Button>
                  {!isDefault && (
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => setDefault(style.id)}>
                      Mettre par défaut
                    </Button>
                  )}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      {error && <ErrorNote message={error} onClose={() => setError(null)} />}

      <Card className="space-y-3 p-5">
        <h2 className="font-display flex items-center gap-1.5 text-lg font-semibold">
          <Plus {...ICON} />
          Nouveau style
        </h2>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) create({ name: name.trim() });
          }}
        >
          <input
            className="field min-w-48 flex-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. : Aquarelle, Papier découpé…"
          />
          <Button type="submit" variant="primary" disabled={busy || !name.trim()}>
            {busy && <Spinner />} Créer
          </Button>
        </form>
        <p className="text-xs text-ink-soft">
          Il part de la description d&apos;origine et d&apos;un dossier d&apos;images vide. Pour
          repartir d&apos;un style existant, duplique-le.
        </p>
      </Card>
    </div>
  );
}
