// The mark atlas: the one picture the shader draws every cell from, as a mask
// (one byte per texel, 255 where ink goes). A mark is a string of text, a ramp
// of characters, or a dropped-in image.
//
// Everything here is pure (no DOM, no GL), so it is tested under node:test.
// rasterize.ts is the other half: it draws glyphs and reads image pixels on a 2D
// canvas, then hands the bytes to these functions to order, crop and pack.

export interface Atlas {
  mask: Uint8Array; // width * height bytes, row-major from the top-left
  width: number;
  height: number;
  tiles: number; // 1 for a single mark; n for a ramp laid out as n tiles in a row
  aspect: number; // width / height of one mark (of one tile, for a ramp)
  chars: string; // a ramp's characters, lightest first; "" for a single mark
}

// The ramp is limited so its row of tiles fits a texture on any WebGL2 device.
export const MAX_RAMP = 48;
export const MAX_TEXT_CHARS = 256; // input past this is ignored: it's a mark, not a document

// --- pure: characters ------------------------------------------------------

// The distinct characters of `text` in first-seen order, whitespace folded to a
// single space so a tab or newline can't mint its own ramp step. Code points,
// not UTF-16 units, so an emoji stays whole.
export function uniqueChars(text: string, max = MAX_TEXT_CHARS): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of Array.from(text).slice(0, max)) {
    const ch = /\s/.test(raw) ? " " : raw;
    if (seen.has(ch)) continue;
    seen.add(ch);
    out.push(ch);
  }
  return out;
}

// Characters sorted by ascending ink coverage. Ties keep their original order,
// so the ramp for a given string is the same on every run.
export function orderByCoverage(chars: string[], coverage: number[]): string[] {
  return chars
    .map((ch, i) => ({ ch, i, c: coverage[i] ?? 0 }))
    .sort((a, b) => a.c - b.c || a.i - b.i)
    .map((e) => e.ch);
}

// At most `max` items, evenly spread and always keeping the first and last, so
// a long ramp thins out without losing either end of its tone range.
export function subsampleEvenly<T>(items: T[], max: number): T[] {
  if (items.length <= max) return items;
  if (max <= 1) return items.slice(0, Math.max(0, max));
  return Array.from({ length: max }, (_, i) => items[Math.round((i * (items.length - 1)) / (max - 1))]);
}

// --- pure: masks -----------------------------------------------------------

// Mean ink of a mask in [0,1]: the share of its texels that are covered.
export function coverageOf(mask: Uint8Array): number {
  if (mask.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < mask.length; i++) sum += mask[i];
  return sum / (255 * mask.length);
}

export type MaskMode = "alpha" | "luminance";

const lum = (r: number, g: number, b: number) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

// An image becomes a mask one of two ways. A picture with real transparency (a
// logo or cut-out) is its own shape, so its alpha is the mask. An opaque one
// has no shape of its own, so its darkness is: dark pixels are ink and light
// ones are paper, the way a photo or scan reads. "Real transparency" is more
// than 2% of pixels not fully opaque, so a stray edge pixel doesn't count.
export function chooseMaskMode(rgba: Uint8ClampedArray): MaskMode {
  const n = Math.floor(rgba.length / 4);
  if (n === 0) return "luminance";
  let see = 0;
  for (let i = 0; i < n; i++) if (rgba[i * 4 + 3] < 250) see++;
  return see / n > 0.02 ? "alpha" : "luminance";
}

// RGBA bytes to a mask. Luminance mode composites on white first, so a
// half-transparent pixel counts as lighter, then inverts.
export function maskFromRgba(rgba: Uint8ClampedArray, mode: MaskMode): Uint8Array {
  const n = Math.floor(rgba.length / 4);
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const a = rgba[i * 4 + 3] / 255;
    if (mode === "alpha") {
      out[i] = rgba[i * 4 + 3];
    } else {
      const l = lum(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]) * a + (1 - a);
      out[i] = Math.round((1 - l) * 255);
    }
  }
  return out;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

// The smallest box holding every texel above `threshold`, or null for a blank
// mask. Cropping to it makes a mark's aspect ratio the ink's, not the canvas's.
export function inkBounds(mask: Uint8Array, width: number, height: number, threshold = 8): Box | null {
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x] > threshold) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

// Copy `box` out of a mask, with a margin of empty texels all round. The margin
// is a mark's built-in gap to its neighbours and keeps mip levels from
// smearing ink into a neighbouring tile.
export function cropMask(
  mask: Uint8Array,
  width: number,
  box: Box,
  padX = 0,
  padY = 0,
): { mask: Uint8Array; width: number; height: number } {
  const w = box.w + 2 * padX;
  const h = box.h + 2 * padY;
  const out = new Uint8Array(w * h);
  for (let y = 0; y < box.h; y++) {
    const from = (box.y + y) * width + box.x;
    out.set(mask.subarray(from, from + box.w), (y + padY) * w + padX);
  }
  return { mask: out, width: w, height: h };
}

// Lay equal-size tiles out left to right in one mask.
export function packTiles(tiles: Uint8Array[], tileW: number, tileH: number): Uint8Array {
  const width = tileW * tiles.length;
  const out = new Uint8Array(width * tileH);
  tiles.forEach((tile, i) => {
    for (let y = 0; y < tileH; y++) {
      out.set(tile.subarray(y * tileW, (y + 1) * tileW), y * width + i * tileW);
    }
  });
  return out;
}

// Shrink (never grow) a size so its longer side is at most `max`, keeping the
// aspect ratio.
export function fitSize(w: number, h: number, max: number): { w: number; h: number } {
  const k = Math.min(1, max / Math.max(w, h, 1));
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
