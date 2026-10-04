import type { Media } from "../data/detailContent";

/**
 * The placeholder surface a Media shows where it has no image.
 *
 * Returned as a CSS value rather than a utility class so there is no per-tone
 * map to keep exhaustive: the tone names are the token names. Tailwind cannot
 * see a class built at runtime, so callers apply this through `style`.
 */
export function mediaToneColor(tone: Media["tone"]) {
  return `var(--media-tone-${tone ?? "neutral"})`;
}

/** Animated GIFs lose their animation through the image optimizer. */
export function isUnoptimizedImage(src: string) {
  return src.toLowerCase().endsWith(".gif");
}
