import { connection } from "next/server";
import { StyleSettings } from "@/components/StyleSettings";
import { DEFAULT_STYLE } from "@/lib/prompt";
import { getSettings } from "@/lib/storage";

export default async function StylePage() {
  await connection();
  const settings = await getSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-navy">Mon style</h1>
        <p className="max-w-2xl text-ink-soft">
          Ce qui ne change jamais d&apos;un sticker à l&apos;autre. Le texte ci-dessous est ajouté à chaque
          prompt, et les exemples cochés sont montrés au modèle comme référence visuelle.
        </p>
      </div>
      <StyleSettings initial={settings} defaultStyle={DEFAULT_STYLE} />
    </div>
  );
}
