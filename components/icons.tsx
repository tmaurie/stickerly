"use client";

export {
  ArrowLeft,
  ArrowRight,
  ArrowsClockwise,
  Camera,
  DownloadSimple,
  PencilSimple,
  Plus,
  Sparkle,
  Star,
  X,
} from "@phosphor-icons/react";

/**
 * One family (Phosphor), one weight, one size, so every control icon matches the
 * chunky display type. Spread it on every icon: `<Star {...ICON} />`.
 *
 * Icons are decorative here, hence aria-hidden. The control's own text or
 * aria-label carries the meaning. The sticker-type emoji (badge, titre, motif,
 * personnages) are brand, not icons, and stay as they are.
 */
export const ICON = { size: 18, weight: "bold", "aria-hidden": true } as const;
