/**
 * Shaped like the workspace it replaces: back link, album title, the four step
 * pills, then a grid of sticker cards. Reading a 40-sticker album off disk is
 * the one wait in the app long enough to notice, and a skeleton that matches
 * the final layout keeps the page from jumping when it arrives.
 */
export default function Loading() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="space-y-2">
        <div className="h-4 w-24 rounded-full bg-line" />
        <div className="h-9 w-64 rounded-full bg-line" />
      </div>

      <div className="flex gap-1 rounded-full bg-white p-1 shadow-clay">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-9 flex-auto animate-pulse rounded-full bg-cream" />
        ))}
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <li key={i} className="overflow-hidden rounded-blob border border-line bg-white shadow-clay">
            <div className="checker aspect-square animate-pulse" />
            <div className="space-y-2 p-4">
              <div className="h-5 w-3/4 rounded-full bg-line" />
              <div className="h-4 w-1/2 rounded-full bg-cream" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
