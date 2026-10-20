import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import sampleBadge from "@/public/samples/badge.png";
import sampleMotif from "@/public/samples/motif.png";
import sampleTitre from "@/public/samples/titre.png";
import { NewAlbumForm } from "@/components/NewAlbumForm";
import { FAKE_AI } from "@/lib/ai";
import { imageUrl } from "@/lib/client-api";
import { stagger } from "@/lib/stagger";
import { listAlbums } from "@/lib/storage";

// previews is capped at 4 by listAlbums; the grid matches the count so short
// albums don't render empty columns. Written out so Tailwind detects the classes.
const PREVIEW_COLS = ["", "grid-cols-1", "grid-cols-2", "grid-cols-3", "grid-cols-4"];

export default async function Home() {
  await connection();
  const albums = await listAlbums();
  const missingKey = !process.env.OPENAI_API_KEY && !FAKE_AI;

  return (
    <div className="space-y-12 md:space-y-16">
      {/* DOM order is text, form, samples, so a phone reads the value prop and
          lands on the form without scrolling past the picture. From md up the
          three are placed explicitly, which puts the samples back under the
          text and lets the form hold the second column on its own. */}
      <section className="grid items-start gap-x-10 gap-y-8 md:grid-cols-[1.05fr_1fr]">
        <div className="space-y-4 md:col-start-1 md:row-start-1">
          <h1 className="font-display text-4xl font-semibold leading-[1.1] text-balance text-navy lg:text-5xl">
            Des stickers en pâte à modeler pour tes albums
          </h1>
          <p className="max-w-[46ch] text-lg leading-relaxed text-ink-soft">
            Tu racontes ton album, Stickerly propose les stickers et les génère dans ton style, prêts à
            poser en PNG.
          </p>
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

        <div className="md:col-start-2 md:row-start-1 md:row-span-2 md:self-start">
          <NewAlbumForm />
        </div>

        {/* One description for the group beats three fragments read in a row,
            so the images themselves are silent. They are eager because they sit
            above the fold; none of the three is reliably the LCP element, which
            is what `preload` wants. */}
        <div
          role="img"
          aria-label="Trois exemples de stickers en pâte à modeler : un badge Lisbonne, un bandeau « Lisbonne à deux » et un pastel de nata souriant."
          className="flex items-center md:col-start-1 md:row-start-2"
        >
          {/* Three different sizes, three different tilts and three different
              baselines: a handful of stickers dropped on the page rather than a
              row of thumbnails. Overlaps stay small so no sticker eats another
              one's lettering. */}
          <Image
            src={sampleBadge}
            alt=""
            loading="eager"
            style={stagger(0)}
            className="drop-in h-auto w-24 self-end rotate-[-7deg] sm:w-28 lg:w-32"
          />
          <Image
            src={sampleTitre}
            alt=""
            loading="eager"
            style={stagger(1)}
            className="drop-in -ml-2 h-auto w-40 rotate-[2deg] sm:w-52 lg:w-60"
          />
          <Image
            src={sampleMotif}
            alt=""
            loading="eager"
            style={stagger(2)}
            className="drop-in -ml-2 h-auto w-16 self-start rotate-[10deg] sm:w-20 lg:w-24"
          />
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="font-display text-2xl font-semibold text-navy">Mes albums</h2>
        {albums.length === 0 ? (
          <p className="rounded-blob border border-dashed border-line px-6 py-10 text-center text-ink-soft">
            Pas encore d&apos;album. Crée le premier juste au-dessus.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((album, i) => (
              <li key={album.id} style={stagger(i)} className="rise-in">
                <Link
                  href={`/albums/${album.id}`}
                  className="lift group block h-full overflow-hidden rounded-blob border border-line bg-white shadow-clay"
                >
                  <div className="checker h-40 p-3">
                    {album.previews.length ? (
                      // Cells stretch rather than centring: a `fill` image is
                      // absolutely positioned, so a centred cell has no content
                      // to take height from and collapses. object-contain does
                      // the centring inside the full-height cell instead.
                      <div className={`grid h-full gap-1 ${PREVIEW_COLS[album.previews.length]}`}>
                        {album.previews.map((file) => (
                          <div key={file} className="relative">
                            <Image
                              src={imageUrl(album.id, file)}
                              alt=""
                              fill
                              sizes="(max-width: 640px) 40vw, 160px"
                              loading={i === 0 ? "eager" : "lazy"}
                              className="object-contain"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="flex h-full items-center justify-center text-sm text-ink-soft">
                        Aucun sticker pour l&apos;instant
                      </p>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-display text-lg font-semibold group-hover:text-action">{album.name}</h3>
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
