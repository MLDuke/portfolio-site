// The sphere, the light and the cell grid: pure maths, no GL and no DOM, so it
// can be tested under node:test. shade() and cellAt() mirror the shader line
// for line; keep the two in step. The renderer and the frame loop both use this
// file, and the shader is handed the results of cellWidthPx().
//
// Units are CSS pixels from the canvas's top-left (y down). Light and normal
// vectors are in sphere space: x right, y up, z toward the viewer.

export type Vec3 = [number, number, number];

const DEG = Math.PI / 180;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function normalize(v: Vec3, fallback: Vec3 = [0, 0, 1]): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]);
  return len < 1e-6 ? [...fallback] : [v[0] / len, v[1] / len, v[2] / len];
}

// --- light -----------------------------------------------------------------

// Azimuth turns the light around the vertical axis (0 is straight at the
// viewer, 90 is from the right, 180 from behind); elevation lifts it. Degrees.
export function lightFromAngles(azimuth: number, elevation: number): Vec3 {
  const az = azimuth * DEG;
  const el = elevation * DEG;
  return [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)];
}

// Hovering at (x, y) puts the light over the point of the sphere under the
// pointer, so the lit patch follows it. Beyond the sphere's rim the light slides
// to the horizon in that direction: it never goes behind the sphere.
export function pointerToLight(x: number, y: number, cx: number, cy: number, radius: number): Vec3 {
  let nx = (x - cx) / radius;
  let ny = -(y - cy) / radius;
  const r = Math.hypot(nx, ny);
  if (r > 1) {
    nx /= r;
    ny /= r;
  }
  return [nx, ny, r > 1 ? 0 : Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny))];
}

// Move `cur` toward `target` by a frame's share of an exponential ease, and
// keep it a unit vector. Frame-rate independent: `rate` is 1/s. Exact opposites
// would average to nothing, so they snap to the target instead.
export function easeLight(cur: Vec3, target: Vec3, dt: number, rate: number): Vec3 {
  const k = 1 - Math.exp(-Math.max(0, rate) * Math.max(0, dt));
  return normalize(
    [cur[0] + (target[0] - cur[0]) * k, cur[1] + (target[1] - cur[1]) * k, cur[2] + (target[2] - cur[2]) * k],
    target,
  );
}

// Close enough that easing is done and the frame loop can sleep.
export function lightSettled(a: Vec3, b: Vec3): boolean {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] > 1 - 1e-6;
}

// --- shading ---------------------------------------------------------------

export interface Shading {
  ambient: number;
  diffuse: number;
  specular: number;
  shininess: number;
  rim: number;
}

// The surface normal at canvas point (x, y) of an orthographic sphere. A point
// outside the disc is pulled onto its edge, so a cell whose centre pokes past
// the rim still has a normal (the grazing one).
export function sphereNormal(x: number, y: number, cx: number, cy: number, radius: number): Vec3 {
  let nx = (x - cx) / radius;
  let ny = -(y - cy) / radius;
  const r = Math.hypot(nx, ny);
  const max = 0.995;
  if (r > max) {
    nx *= max / r;
    ny *= max / r;
  }
  return [nx, ny, Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny))];
}

// Lambert + ambient, plus optional Blinn-Phong and rim, clamped to [0,1]. The
// viewer looks down -z, so the half vector is the light plus (0,0,1).
export function shade(n: Vec3, light: Vec3, s: Shading): number {
  const diff = Math.max(0, n[0] * light[0] + n[1] * light[1] + n[2] * light[2]);
  const h = normalize([light[0], light[1], light[2] + 1]);
  const nh = Math.max(0, n[0] * h[0] + n[1] * h[1] + n[2] * h[2]);
  const spec = diff > 0 ? Math.pow(nh, Math.max(1, s.shininess)) : 0;
  const rim = Math.pow(1 - n[2], 3);
  return clamp01(s.ambient + s.diffuse * diff + s.specular * spec + s.rim * rim);
}

export interface Tone {
  invert: boolean;
  gamma: number;
  contrast: number;
}

// Light to ink: the poster inks the shadow, so `invert` (on by default) makes
// dark cells heavy. Contrast pivots on mid grey; gamma above 1 thins the middle.
export function inkOf(light: number, t: Tone): number {
  const base = t.invert ? 1 - light : light;
  const contrasted = clamp01((base - 0.5) * t.contrast + 0.5);
  return Math.pow(contrasted, Math.max(0.01, t.gamma));
}

// --- marks -----------------------------------------------------------------

// How big `scale` mode draws a mark, as a fraction of its full size.
export function markScale(ink: number, minScale: number): number {
  return minScale + (1 - minScale) * clamp01(ink);
}

// `ramp` mode: which of `n` characters (sorted lightest to heaviest) a cell
// shows. Ink 1 lands on the last one rather than past it.
export function rampIndex(ink: number, n: number): number {
  if (n <= 1) return 0;
  return Math.min(n - 1, Math.floor(clamp01(ink) * n));
}

// A cell is as wide as the mark at full size, times the cellWidth dial, so at 1
// marks pack edge to edge. The mark's height at full size is fill * rowHeight.
export function cellWidthPx(rowHeight: number, fill: number, aspect: number, cellWidth: number): number {
  return Math.max(1, rowHeight * fill * aspect * cellWidth);
}

// The sphere's radius in px: the dial's share of the shorter side, pulled in just
// enough that everything drawn stays inside the canvas. Marks hang off the right
// rim (a cell starts inside the sphere, and its mark runs on from there), and
// the top and bottom rows' marks are half a mark tall, so the radius leaves room
// for a full-size mark at both. At the default dials that only bites on a narrow
// stage; the dial otherwise wins.
export function sphereRadiusPx(
  fraction: number,
  width: number,
  height: number,
  rowHeight: number,
  fill: number,
  aspect: number,
): number {
  const markH = rowHeight * fill;
  const room = Math.min(width / 2 - markH * aspect - 1, height / 2 - markH / 2 - 1);
  return Math.max(1, Math.min(fraction * Math.min(width, height), room));
}

// --- grid ------------------------------------------------------------------

export interface GridInput {
  cx: number; // sphere centre
  cy: number;
  radius: number;
  rowHeight: number;
  cellWidth: number; // px, from cellWidthPx()
  stagger: number; // fraction of a cell that odd rows shift right
  alignLeft: boolean; // rows start on the sphere's left edge, like the poster
}

export interface Cell {
  row: number; // 0 is the row centred on the sphere's centre; negative is above
  col: number;
  anchorX: number; // the cell's left edge: where its mark is anchored
  centreY: number; // the row's centre line
  centreX: number; // where the shading is sampled
  inside: boolean; // a mark is drawn here: its anchor is in the sphere
}

// A cell is inside when its left-centre anchor is in the sphere, so a mark may
// overhang the right-hand rim. One pixel of slack so the first cell of an aligned row, whose anchor is on the rim
// by construction, isn't lost to rounding.
const RIM_SLACK = 0.75;

// The cell under canvas point (x, y). Rows are centred on the sphere, evenly
// spaced, so the layout is symmetric about the horizontal midline. Within a row
// cells start at the sphere's left edge on that row (or the sphere's bounding
// edge when not aligned); odd rows are shifted by `stagger` of a cell.
export function cellAt(x: number, y: number, g: GridInput): Cell {
  const row = Math.floor((y - g.cy) / g.rowHeight + 0.5);
  const centreY = g.cy + row * g.rowHeight;
  const dy = centreY - g.cy;
  const none: Cell = { row, col: 0, anchorX: 0, centreY, centreX: 0, inside: false };
  if (Math.abs(dy) > g.radius) return none;
  const edge = g.cx - (g.alignLeft ? Math.sqrt(g.radius * g.radius - dy * dy) : g.radius);
  const off = (((row % 2) + 2) % 2) * g.stagger * g.cellWidth;
  const col = Math.floor((x - edge - off) / g.cellWidth);
  const anchorX = edge + off + col * g.cellWidth;
  const cell: Cell = { row, col, anchorX, centreY, centreX: anchorX + g.cellWidth / 2, inside: false };
  if (g.alignLeft && col < 0) return cell;
  cell.inside = Math.hypot(anchorX - g.cx, dy) <= g.radius + RIM_SLACK;
  return cell;
}

// A cell's ink: the shading at its centre, turned into ink. This is the whole
// per-cell pipeline the shader runs, so tests can pin it down.
export function cellInk(cell: Cell, g: GridInput, light: Vec3, s: Shading, t: Tone): number {
  const n = sphereNormal(cell.centreX, cell.centreY, g.cx, g.cy, g.radius);
  return inkOf(shade(n, light, s), t);
}

// --- packed rows -----------------------------------------------------------
// The poster doesn't keep its words on a fixed grid: each row is laid end to
// end from the circle's edge, so a word that shrinks pulls the next one in and
// the lit side stays dense with small words instead of going sparse. Where one
// word starts depends on the widths of all those before it, so a pixel can't
// find it by division. The layout is worked out here per row (a few thousand
// shades, nothing next to the pixel count) and handed to the shader as a
// texture it binary-searches.

export const MAX_ROW_CELLS = 256; // cells kept per row; a row that needs more is cut short
export const NO_CELL = 1e9; // the anchor of an empty slot: past every pixel

export interface PackedInput {
  cx: number;
  cy: number;
  radius: number;
  rowHeight: number;
  fullWidth: number; // a mark's width at full size, px
  cellWidth: number; // the dial: pitch as a multiple of the drawn mark's width
  minScale: number;
  alignLeft: boolean;
}

// Rows run from -halfRows to +halfRows about the centre row, and a row's slot in
// the layout is row + halfRows.
export function packedHalfRows(radius: number, rowHeight: number): number {
  return Math.floor(radius / rowHeight);
}

// The ink at a canvas point: shade, then tone. What a cell's mark size and
// character come from.
export function inkAt(x: number, y: number, g: { cx: number; cy: number; radius: number }, light: Vec3, s: Shading, t: Tone): number {
  return inkOf(shade(sphereNormal(x, y, g.cx, g.cy, g.radius), light, s), t);
}

// The mark a cell holds, drawn at the scale its own centre's ink asks for, is
// that wide; and where the centre is depends on the width. A few rounds of
// "measure the width, move the centre" settle it to well under a pixel, since
// the width changes slowly across a cell.
function settledWidth(x: number, yc: number, g: PackedInput, light: Vec3, s: Shading, t: Tone): number {
  let w = g.fullWidth;
  for (let i = 0; i < 4; i++) w = g.fullWidth * markScale(inkAt(x + w / 2, yc, g, light, s, t), g.minScale);
  return w;
}

// One row's cells as (anchor, pitch) pairs, written into `out` from `offset`.
// Cells run from the circle's edge (or the bounding edge) to the far rim, keeping those that start inside the sphere. The rest of the row's slots are NO_CELL. Returns the cells written.
export function packedRow(
  row: number,
  g: PackedInput,
  light: Vec3,
  s: Shading,
  t: Tone,
  out: Float32Array,
  offset: number,
): number {
  const yc = g.cy + row * g.rowHeight;
  const dy = yc - g.cy;
  let n = 0;
  if (Math.abs(dy) <= g.radius) {
    const edge = g.cx - (g.alignLeft ? Math.sqrt(g.radius * g.radius - dy * dy) : g.radius);
    let x = edge;
    // On the bounding edge, a row near the top or bottom starts outside the
    // circle: those cells take up room but aren't kept. The step bound only
    // guards against a pathologically thin mark.
    for (let step = 0; step < MAX_ROW_CELLS * 4 && n < MAX_ROW_CELLS && x <= g.cx + g.radius; step++) {
      const w = settledWidth(x, yc, g, light, s, t);
      const pitch = Math.max(0.5, w * g.cellWidth);
      if (Math.hypot(x - g.cx, dy) <= g.radius + RIM_SLACK) {
        out[offset + n * 2] = x;
        out[offset + n * 2 + 1] = pitch;
        n++;
      }
      x += pitch;
    }
  }
  for (let i = n; i < MAX_ROW_CELLS; i++) {
    out[offset + i * 2] = NO_CELL;
    out[offset + i * 2 + 1] = 1;
  }
  return n;
}

// Every row of the sphere: rows * MAX_ROW_CELLS * 2 floats, row-major from the
// top row. Reuses `reuse` when it's big enough.
export function packedLayout(
  g: PackedInput,
  light: Vec3,
  s: Shading,
  t: Tone,
  reuse?: Float32Array,
): { data: Float32Array; rows: number } {
  const half = packedHalfRows(g.radius, g.rowHeight);
  const rows = 2 * half + 1;
  const size = rows * MAX_ROW_CELLS * 2;
  const data = reuse && reuse.length >= size ? reuse : new Float32Array(size);
  for (let r = 0; r < rows; r++) packedRow(r - half, g, light, s, t, data, r * MAX_ROW_CELLS * 2);
  return { data, rows };
}

// The cell under canvas point (x, y) in a packed layout, or null in a gap, off
// the rows or before the first cell. Mirrors the shader's binary search. The
// returned cell is `inside` by construction, since the layout only holds cells
// that start in the sphere.
export function packedCellAt(
  x: number,
  y: number,
  g: PackedInput,
  layout: { data: Float32Array; rows: number },
): { row: number; col: number; anchorX: number; pitch: number } | null {
  const half = packedHalfRows(g.radius, g.rowHeight);
  const row = Math.floor((y - g.cy) / g.rowHeight + 0.5);
  if (row < -half || row > half) return null;
  const base = (row + half) * MAX_ROW_CELLS * 2;
  let lo = 0;
  let hi = MAX_ROW_CELLS - 1;
  if (layout.data[base] > x) return null;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (layout.data[base + mid * 2] <= x) lo = mid;
    else hi = mid - 1;
  }
  const anchorX = layout.data[base + lo * 2];
  const pitch = layout.data[base + lo * 2 + 1];
  if (anchorX >= NO_CELL || x >= anchorX + pitch) return null;
  return { row, col: lo, anchorX, pitch };
}
