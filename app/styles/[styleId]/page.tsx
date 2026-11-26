import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, ICON } from "@/components/icons";
import { StyleEditor } from "@/components/StyleEditor";
import { getLibrary } from "@/lib/storage";
import { findStyle } from "@/lib/types";

export async function generateMetadata(props: PageProps<"/styles/[styleId]">): Promise<Metadata> {
  const { styleId } = await props.params;
  const style = findStyle(await getLibrary(), styleId);
  return { title: style?.name ?? "Style introuvable" };
}

export default async function StylePage(props: PageProps<"/styles/[styleId]">) {
  await connection();
  const { styleId } = await props.params;
  const library = await getLibrary();
  const style = findStyle(library, styleId);
  if (!style) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/styles"
          className="inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-action"
        >
          <ArrowLeft {...ICON} size={16} />
          Mes styles
        </Link>
        <h1 className="font-display text-3xl font-semibold text-navy">{style.name}</h1>
      </div>
      <StyleEditor
        initial={style}
        folder={`references/${style.id}/`}
        canDelete={library.styles.length > 1}
      />
    </div>
  );
}
