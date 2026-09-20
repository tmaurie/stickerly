"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client-api";
import type { Album } from "@/lib/types";
import { Button, Card, ErrorNote, Spinner } from "./ui";

export function NewAlbumForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [theme, setTheme] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const album = await api<Album>("/api/albums", { method: "POST", json: { name, theme } });
      router.push(`/albums/${album.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Card className="p-5 shadow-sm">
      <form onSubmit={submit} className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Nouvel album</h2>
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Nom</span>
          <input
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Italie, septembre 2026"
            required
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Thème et contexte</span>
          <textarea
            className="field"
            rows={4}
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="Road trip en Toscane à deux : Florence, Pise, Sienne, Cinque Terre. Beaucoup de gelato, une nuit dans un agriturismo, la Vespa louée à Lucques…"
          />
          <span className="text-xs text-ink-soft">
            Plus tu donnes de détails (lieux, personnes, anecdotes), plus les idées seront justes.
          </span>
        </label>
        {error && <ErrorNote message={error} />}
        <Button type="submit" variant="primary" disabled={busy || !name.trim()} className="w-full">
          {busy ? <Spinner /> : null} Créer l&apos;album
        </Button>
      </form>
    </Card>
  );
}
