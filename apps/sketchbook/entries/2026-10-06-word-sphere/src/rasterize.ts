import {
  chooseMaskMode,
  coverageOf,
  cropMask,
  fitSize,
  inkBounds,
  MAX_RAMP,
  MAX_TEXT_CHARS,
  maskFromRgba,
  median,
  orderByCoverage,
  packTiles,
  subsampleEvenly,
  uniqueChars,
} from "./atlas.ts";
import type { Atlas } from "./atlas.ts";

// The DOM half of the atlas: draws a string's glyphs, or reads an image's
// pixels, on a 2D canvas and turns them into an Atlas with the pure functions
// in atlas.ts. Nothing here runs at import.

const MAX_IMAGE_PX = 512; // marks are small; a bigger source only costs memory
const MAX_ATLAS_PX = 2048; // widest a text mark's bitmap may get

// Heavy and wide, with literal fallbacks so the atlas looks alike wherever the
// first choice is missing. Sized per use.
const FONT_STACK = `"Helvetica Neue", "Arial Black", Arial, sans-serif`;
const FONT_WEIGHT = 900;

function scratch(width: number, height: number): CanvasRenderingContext2D {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("A 2D canvas isn't available");
  return ctx;
}

function alphaOf(ctx: CanvasRenderingContext2D): Uint8Array {
  const { width, height } = ctx.canvas;
  return maskFromRgba(ctx.getImageData(0, 0, width, height).data, "alpha");
}

const fontOf = (px: number) => `${FONT_WEIGHT} ${px}px ${FONT_STACK}`;

// The whole string as one mark, cropped to its ink. Null for blank text.
export function buildTextAtlas(text: string): Atlas | null {
  const str = Array.from(text).slice(0, MAX_TEXT_CHARS).join("").replace(/\s+/g, " ").trim();
  if (!str) return null;

  // Rasterize big and let the mipmaps shrink it. A very long string is drawn
  // smaller instead, to stay inside the texture limit.
  const probe = scratch(1, 1);
  const BASE_PX = 160;
  probe.font = fontOf(BASE_PX);
  const perPx = probe.measureText(str).width / BASE_PX; // string width in ems
  const px = Math.max(24, Math.min(BASE_PX, Math.floor(MAX_ATLAS_PX / (perPx + 0.6))));
  const margin = Math.ceil(px * 0.3);
  probe.font = fontOf(px);
  const width = Math.ceil(probe.measureText(str).width) + 2 * margin;
  const height = Math.ceil(px * 1.7);

  const ctx = scratch(width, height);
  ctx.font = fontOf(px);
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(str, margin, Math.round(px * 1.2));
  const mask = alphaOf(ctx);

  const box = inkBounds(mask, width, height);
  if (!box) return null;
  // A side margin of 14% of the height each side, so words an em or so apart
  // stay readable as separate words when they pack end to end.
  const cropped = cropMask(mask, width, box, Math.round(box.h * 0.14), 1);
  return {
    mask: cropped.mask,
    width: cropped.width,
    height: cropped.height,
    tiles: 1,
    aspect: cropped.width / cropped.height,
    chars: "",
  };
}

const TILE_H = 64; // a ramp tile's height, texels
const TILE_CAP = 54; // its capital height; the rest is margin
const TILE_PAD_X = 6;

// One tile per distinct character of `text`, ordered by measured coverage so
// the first is the lightest. Every tile shares a size and baseline, with glyphs
// centred and squeezed to fit, so the cells of a ramp line up like type.
export function buildRampAtlas(text: string): Atlas | null {
  const chars = uniqueChars(text);
  if (chars.length === 0) return null;

  const probe = scratch(1, 1);
  probe.font = fontOf(100);
  const capRatio = probe.measureText("H").actualBoundingBoxAscent / 100 || 0.72;
  const px = TILE_CAP / capRatio;
  probe.font = fontOf(px);
  const ink = chars.map((ch) => {
    const m = probe.measureText(ch);
    return m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
  });
  const typical = median(ink.filter((w) => w > 0));
  const tileW = Math.min(120, Math.max(24, Math.round(typical) + 2 * TILE_PAD_X));

  const ctx = scratch(tileW, TILE_H);
  const tiles = chars.map((ch, i) => {
    ctx.clearRect(0, 0, tileW, TILE_H);
    ctx.font = fontOf(px);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    const sx = ink[i] > 0 ? Math.min(1, (tileW - 2 * TILE_PAD_X) / ink[i]) : 1;
    ctx.save();
    ctx.translate(tileW / 2, (TILE_H - TILE_CAP) / 2 + TILE_CAP);
    ctx.scale(sx, 1);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    return alphaOf(ctx);
  });

  const order = orderByCoverage(chars, tiles.map(coverageOf));
  const kept = subsampleEvenly(order, MAX_RAMP);
  const byChar = new Map(chars.map((ch, i) => [ch, tiles[i]]));
  const packed = packTiles(
    kept.map((ch) => byChar.get(ch)!),
    tileW,
    TILE_H,
  );
  return {
    mask: packed,
    width: tileW * kept.length,
    height: TILE_H,
    tiles: kept.length,
    aspect: tileW / TILE_H,
    chars: kept.join(""),
  };
}

// A decoded image as a mark: shrunk to MAX_IMAGE_PX, turned into a mask by
// chooseMaskMode() and cropped to its ink. Null when it has none to draw (a
// blank page, an all-transparent PNG).
export function buildImageAtlas(bitmap: ImageBitmap): Atlas | null {
  const { w, h } = fitSize(bitmap.width, bitmap.height, MAX_IMAGE_PX);
  const ctx = scratch(w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  const rgba = ctx.getImageData(0, 0, w, h).data;
  const mask = maskFromRgba(rgba, chooseMaskMode(rgba));
  const box = inkBounds(mask, w, h);
  if (!box) return null;
  // A side margin of 10% of the height keeps neighbours from fusing when the
  // marks pack end to end.
  const cropped = cropMask(mask, w, box, Math.round(box.h * 0.1), 1);
  return {
    mask: cropped.mask,
    width: cropped.width,
    height: cropped.height,
    tiles: 1,
    aspect: cropped.width / cropped.height,
    chars: "",
  };
}
