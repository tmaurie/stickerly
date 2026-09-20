import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const fredoka = Fredoka({ variable: "--font-fredoka", subsets: ["latin"] });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Stickerly",
  description: "Des stickers en pâte à modeler pour tes albums photo",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${fredoka.variable} ${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="border-b border-line bg-cream/90 backdrop-blur sticky top-0 z-20">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="font-display text-2xl font-semibold text-navy">
              Sticker<span className="text-terracotta">ly</span>
            </Link>
            <div className="flex gap-1 text-sm font-semibold">
              <Link href="/" className="rounded-full px-3 py-1.5 hover:bg-white">
                Mes albums
              </Link>
              <Link href="/style" className="rounded-full px-3 py-1.5 hover:bg-white">
                Mon style
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
