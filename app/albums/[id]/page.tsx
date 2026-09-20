import { notFound } from "next/navigation";
import { AlbumWorkspace } from "@/components/AlbumWorkspace";
import { getAlbum, getSettings, referenceCounts } from "@/lib/storage";

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
      imageSettings={`${settings.model} · qualité ${settings.quality}`}
    />
  );
}
