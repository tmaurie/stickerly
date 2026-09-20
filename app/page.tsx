import Link from "next/link";
import { connection } from "next/server";
import { NewAlbumForm } from "@/components/NewAlbumForm";
import { FAKE_AI } from "@/lib/ai";
import { imageUrl } from "@/lib/client-api";
import { listAlbums } from "@/lib/storage";

const STEPS = [
  ["1", "Le thème", "Raconte l'album : lieux, personnes, anecdotes."],
  ["2", "Les idées", "Stickerly propose des stickers, tu tries et tu retouches."],
  ["3", "La génération", "Ton style est appliqué à chaque fois, tu ajustes en un clic."],
  ["4", "L'export", "Tu télécharges tes favoris en PNG transparents."],
];

export default async function Home() {
  await connection();
  const albums = await listAlbums();
  const missingKey = !process.env.OPENAI_API_KEY && !FAKE_AI;

  return (
    <div className="space-y-10">
      <section className="grid gap-8 md:grid-cols-[1.1fr_1fr] md:items-start">
        <div className="space-y-4">
          <h1 className="font-display text-4xl font-semibold leading-tight text-navy md:text-5xl">
            Des stickers en pâte à modeler pour tes albums
          </h1>
          <ol className="grid gap-2 sm:grid-cols-2">
            {STEPS.map(([n, title, text]) => (
              <li key={n} className="flex gap-3 rounded-2xl bg-white/70 p-3">
                <span className="font-display flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky text-navy">
                  {n}
                </span>
                <span className="text-sm">
                  <strong className="block">{title}</strong>
                  <span className="text-ink-soft">{text}</span>
                </span>
              </li>
            ))}
          </ol>
          {missingKey && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Aucune clé OpenAI détectée. Crée un fichier <code>.env.local</code> avec{" "}
              <code>OPENAI_API_KEY=sk-…</code> puis relance <code>npm run dev</code>.
            </p>
          )}
          {FAKE_AI && (
            <p className="rounded-xl border border-sky bg-white px-3 py-2 text-sm text-navy">
              Mode démo actif : aucune image n&apos;est réellement générée.
            </p>
          )}
        </div>
        <NewAlbumForm />
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold">Mes albums</h2>
        {albums.length === 0 ? (
          <p className="text-ink-soft">Pas encore d&apos;album. Crée le premier juste au-dessus.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((album) => (
              <li key={album.id}>
                <Link
                  href={`/albums/${album.id}`}
                  className="group block overflow-hidden rounded-blob border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="checker grid h-40 grid-cols-4 items-center gap-1 p-3">
                    {album.previews.length ? (
                      album.previews.map((file) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={file} src={imageUrl(album.id, file)} alt="" className="h-full w-full object-contain" />
                      ))
                    ) : (
                      <span className="col-span-4 text-center text-sm text-ink-soft">Aucun sticker pour l&apos;instant</span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-display text-lg font-semibold group-hover:text-terracotta">{album.name}</h3>
                    <p className="line-clamp-2 text-sm text-ink-soft">{album.theme || "Pas de thème"}</p>
                    <p className="mt-2 text-xs font-semibold text-sage">
                      {album.stickerCount} sticker{album.stickerCount > 1 ? "s" : ""}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
