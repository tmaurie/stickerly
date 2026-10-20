"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui";

/**
 * Anything that throws outside a route handler used to land on Next's own error
 * page, in English, with none of the app around it. The message is shown as-is
 * because this runs on one machine for one person: it is the same detail the
 * inline ErrorNote already gives after a failed generation.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
      <h1 className="font-display text-3xl font-semibold text-navy">Quelque chose a cassé</h1>
      <p className="text-ink-soft">{error.message || "Erreur inattendue."}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="primary" onClick={reset}>
          Réessayer
        </Button>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 font-semibold text-ink transition hover:border-ink-soft/40"
        >
          Mes albums
        </Link>
      </div>
    </div>
  );
}
