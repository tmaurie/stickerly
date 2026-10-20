import type { CSSProperties } from "react";

/**
 * Per-item delay index for the `.rise-in` entry in globals.css.
 *
 * Capped, because the cascade is there to lead the eye across the first row or
 * two and nothing else. An album holding forty stickers would otherwise hold
 * the last card back for more than two seconds, which reads as a page that has
 * failed to load rather than as a reveal.
 */
export const STAGGER_CAP = 7;

export function stagger(index: number): CSSProperties {
  return { "--i": Math.min(index, STAGGER_CAP) } as CSSProperties;
}
