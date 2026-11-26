import type { Metadata } from "next";
import { connection } from "next/server";
import { StyleLibrary } from "@/components/StyleLibrary";
import { getLibrary } from "@/lib/storage";

export const metadata: Metadata = { title: "Mes styles" };

export default async function StylesPage() {
  await connection();
  const library = await getLibrary();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold text-navy">Mes styles</h1>
        <p className="max-w-[65ch] leading-relaxed text-ink-soft">
          Un style, c&apos;est une manière de rendre : la matière, la lumière, la palette, le
          lettrage. Chaque album en choisit un, et un sticker peut en choisir un autre.
        </p>
      </div>
      <StyleLibrary initial={library} />
    </div>
  );
}
