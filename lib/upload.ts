/**
 * What counts as an uploadable image, for the reference photos and for the
 * image-to-sticker conversion. Shared with the client so the file inputs offer
 * the same formats and refuse an oversized file without a round trip.
 */

/** Accepted MIME types, and the extension each one is stored under. */
export const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** For the `accept` attribute of a file input. */
export const IMAGE_ACCEPT = Object.keys(IMAGE_EXTENSIONS).join(",");

export const MAX_IMAGE_MB = 10;

/** `null` when the file can be stored, otherwise the reason, ready to display. */
export function imageRejection(file: { name: string; type: string; size: number }): string | null {
  if (!IMAGE_EXTENSIONS[file.type]) {
    return `Format non pris en charge : ${file.name} (PNG, JPG ou WebP).`;
  }
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
    const mb = Math.round((file.size / (1024 * 1024)) * 10) / 10;
    return `Image trop lourde : ${file.name} fait ${mb} Mo (${MAX_IMAGE_MB} Mo maximum).`;
  }
  return null;
}
