import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlbumWorkspace } from "@/components/AlbumWorkspace";
import { getAlbum, getSettings, referenceCounts } from "@/lib/storage";
import { MODEL_INFO, QUALITY_INFO } from "@/lib/types";

export async function generateMetadata(props: PageProps<"/albums/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const album = await getAlbum(id).catch(() => null);
  return { title: album?.name ?? "Album introuvable" };
}

export default async function AlbumPage(props: PageProps<"/albums/[id]">) {
  const { id } = await props.params;
  const album = await getAlbum(id).catch(() => null);
  if (!album) notFound();
  const settings = await getSettings();

  return (
    <AlbumWorkspace
      initialAlbum={album}
      style={settings.style}
      refCounts={referenceCounts(settings)}
      // The names from "Mon style", not the raw model id the API takes.
      imageSettings={`${MODEL_INFO[settings.model].label} · qualité ${QUALITY_INFO[settings.quality].short}`}
    />
  );
}
