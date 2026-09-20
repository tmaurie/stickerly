export function slugify(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "sticker"
  );
}

/** File name for a sticker download, e.g. "03-florence.png". */
export function stickerFileName(index: number, label: string): string {
  return `${String(index + 1).padStart(2, "0")}-${slugify(label)}.png`;
}
