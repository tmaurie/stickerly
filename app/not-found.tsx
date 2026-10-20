import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
      <h1 className="font-display text-3xl font-semibold text-navy">Rien à cette adresse</h1>
      <p className="text-ink-soft">
        L&apos;album que tu cherches a peut-être été supprimé, ou son lien n&apos;est plus bon.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center gap-1.5 rounded-full bg-action px-4 py-2 font-semibold text-white shadow-[0_3px_0_var(--color-action-shadow)] transition hover:brightness-105 active:translate-y-[2px] active:shadow-[0_1px_0_var(--color-action-shadow)]"
      >
        Revenir à mes albums
      </Link>
    </div>
  );
}
