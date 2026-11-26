import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlbumWorkspace } from "@/components/AlbumWorkspace";
import { getAlbum, getLibrary } from "@/lib/storage";
import { styleSummary } from "@/lib/types";

export async function generateMetadata(props: PageProps<"/albums/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const album = await getAlbum(id).catch(() => null);
  return { title: album?.name ?? "Album introuvable" };
}

export default async function AlbumPage(props: PageProps<"/albums/[id]">) {
  const { id } = await props.params;
  const album = await getAlbum(id).catch(() => null);
  if (!album) notFound();
  const library = await getLibrary();

  return (
    <AlbumWorkspace
      initialAlbum={album}
      // Summaries rather than the Styles themselves: previewing a prompt needs
      // the description and the reference counts, and nothing else.
      styles={library.styles.map(styleSummary)}
      defaultStyleId={library.defaultStyleId}
    />
  );
}
