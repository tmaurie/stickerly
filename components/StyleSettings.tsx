"use client";

import { useState } from "react";
import { api, referenceUrl } from "@/lib/client-api";
import type { ImageModelId, ImageQuality, Settings, StickerKind } from "@/lib/types";
import { KIND_INFO, STICKER_KINDS } from "@/lib/types";
import { Button, Card, ErrorNote, Spinner } from "./ui";

const MODELS: { id: ImageModelId; label: string; hint: string }[] = [
  { id: "gpt-image-2.5-flare", label: "Flare", hint: "Rapide, très bon au quotidien" },
  { id: "gpt-image-2.5-sunburst", label: "Sunburst", hint: "Plus précis, idéal pour les retouches" },
];

const QUALITIES: { id: ImageQuality; label: string }[] = [
  { id: "low", label: "Brouillon" },
  { id: "medium", label: "Moyenne" },
  { id: "high", label: "Haute (conseillée)" },
  { id: "xhigh", label: "Très haute (plus lente et plus chère)" },
];

export function StyleSettings({ initial, defaultStyle }: { initial: Settings; defaultStyle: string }) {
  const [settings, setSettings] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(settings) !== JSON.stringify(saved);

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const next = await api<Settings>("/api/settings", { method: "PUT", json: settings });
      setSettings(next);
      setSaved(next);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const references = Object.entries(settings.references);
  const perKind = (kind: StickerKind) => references.filter(([, k]) => k === kind).length;

  return (
    <div className="space-y-6 pb-24">
      <Card className="space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl font-semibold">Description du style</h2>
          {settings.style !== defaultStyle && (
            <Button size="sm" variant="ghost" onClick={() => set("style", defaultStyle)}>
              Rétablir le style d&apos;origine
            </Button>
          )}
        </div>
        <textarea
          className="field font-mono text-sm"
          rows={9}
          value={settings.style}
          onChange={(e) => set("style", e.target.value)}
        />
        <p className="text-xs text-ink-soft">
          En anglais, les modèles d&apos;image le suivent un peu mieux. Chaque type de sticker (badge, titre…) a
          en plus sa propre mise en page, visible dans « Prompt » sur chaque sticker.
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
                className="mt-1 accent-terracotta"
                checked={settings.model === m.id}
                onChange={() => set("model", m.id)}
              />
              <span>
                <strong>{m.label}</strong> <span className="text-sm text-ink-soft">· {m.hint}</span>
              </span>
            </label>
          ))}
        </Card>
        <Card className="space-y-3 p-5">
          <h2 className="font-display text-xl font-semibold">Qualité</h2>
          <select
            className="field"
            value={settings.quality}
            onChange={(e) => set("quality", e.target.value as ImageQuality)}
          >
            {QUALITIES.map((q) => (
              <option key={q.id} value={q.id}>
                {q.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-ink-soft">
            « Brouillon » est pratique pour tester une idée à moindre coût, puis « Autre version » en haute
            qualité.
          </p>
        </Card>
      </div>

      <Card className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">Exemples de référence</h2>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              className="h-4 w-4 accent-terracotta"
              checked={settings.useReferences}
              onChange={(e) => set("useReferences", e.target.checked)}
            />
            Montrer des exemples au modèle
          </label>
        </div>
        <p className="text-sm text-ink-soft">
          À chaque génération, jusqu&apos;à{" "}
          <select
            className="rounded-md border border-line bg-white px-1"
            value={settings.maxReferences}
            onChange={(e) => set("maxReferences", Number(e.target.value))}
            disabled={!settings.useReferences}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>{" "}
          exemples du même type sont tirés au hasard et joints au prompt. C&apos;est ce qui garde le rendu
          cohérent d&apos;un sticker à l&apos;autre. Pour en ajouter, dépose des PNG dans le dossier{" "}
          <code>references/</code> du projet.
        </p>
        <p className="flex flex-wrap gap-2 text-xs">
          {STICKER_KINDS.map((kind) => (
            <span key={kind} className="rounded-full bg-cream px-2 py-1">
              {KIND_INFO[kind].emoji} {KIND_INFO[kind].label} : {perKind(kind)}
            </span>
          ))}
        </p>
        {references.length === 0 ? (
          <p className="text-sm text-ink-soft">Aucune image trouvée dans references/.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {references.map(([file, kind]) => (
              <li key={file} className={`space-y-1.5 ${kind === "none" ? "opacity-50" : ""}`}>
                <div className="checker aspect-square overflow-hidden rounded-xl border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={referenceUrl(file)} alt={file} className="h-full w-full object-contain p-1" loading="lazy" />
                </div>
                <select
                  className="field py-1 text-xs"
                  value={kind}
                  onChange={(e) =>
                    set("references", { ...settings.references, [file]: e.target.value as StickerKind | "none" })
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

      {dirty && (
        <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-full bg-navy py-2 pl-5 pr-2 text-white shadow-xl">
            <span className="text-sm">Modifications non enregistrées</span>
            <Button variant="ghost" className="text-white/80 hover:bg-white/10 hover:text-white" onClick={() => setSettings(saved)}>
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
