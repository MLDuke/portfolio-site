// Pushes for the image source: displacement the pointer (or an agitator)
// drags and damped springs pull back. Pure maths, no GL and no DOM, so it can
// be tested under node:test; the renderer uploads the fields as textures.
//
// Two shapes of push. A PushField is a brush: a 2D field where a push carries
// a soft round patch along. A StripField slides whole rows (or columns) of the
// picture edge to edge, one offset per strip, like a sliding puzzle.
//
// Units are CSS pixels of the full-size composition (panel scale 1), from its
// top-left. A cell holding displacement d shows the picture from d px back,
// so dragging the pointer right carries the picture under it to the right.

export const PUSH_CELL = 8; // px per field cell; independent of the dot pitch

const MAX_STEP = 1 / 120; // spring substep, s: stable up to the stiffness dial's top
const REST = 0.02; // px and px/s below which a cell counts as settled

export interface PushField {
  width: number;
  height: number;
  cols: number;
  rows: number;
  disp: Float32Array; // x, y per cell, row-major from the top-left
  vel: Float32Array; // the same layout, px/s
  resting: boolean; // every cell is exactly zero; stepping is a no-op
  version: number; // bumped on every change, so the renderer re-uploads only then
}

export function createPushField(width: number, height: number): PushField {
  const cols = Math.max(1, Math.ceil(width / PUSH_CELL));
  const rows = Math.max(1, Math.ceil(height / PUSH_CELL));
  return {
    width,
    height,
    cols,
    rows,
    disp: new Float32Array(cols * rows * 2),
    vel: new Float32Array(cols * rows * 2),
    resting: true,
    version: 0,
  };
}

// The pointer moved by (dx, dy) and is now at (x, y). Cells within `radius`
// are carried along, most at the centre and none at the edge. Displacement is
// capped at twice the radius so repeated swipes stretch, not tear.
export function pushAt(
  f: PushField,
  x: number,
  y: number,
  dx: number,
  dy: number,
  radius: number,
  strength: number,
): void {
  if (radius <= 0 || strength === 0 || (dx === 0 && dy === 0)) return;
  const cap = radius * 2;
  const c0 = Math.max(0, Math.floor((x - radius) / PUSH_CELL));
  const c1 = Math.min(f.cols - 1, Math.floor((x + radius) / PUSH_CELL));
  const r0 = Math.max(0, Math.floor((y - radius) / PUSH_CELL));
  const r1 = Math.min(f.rows - 1, Math.floor((y + radius) / PUSH_CELL));
  let touched = false;
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const ox = (c + 0.5) * PUSH_CELL - x;
      const oy = (r + 0.5) * PUSH_CELL - y;
      const q = (ox * ox + oy * oy) / (radius * radius);
      if (q >= 1) continue;
      const w = (1 - q) * (1 - q) * strength;
      const i = (r * f.cols + c) * 2;
      let nx = f.disp[i] + dx * w;
      let ny = f.disp[i + 1] + dy * w;
      const len = Math.hypot(nx, ny);
      if (len > cap) {
        nx *= cap / len;
        ny *= cap / len;
      }
      f.disp[i] = nx;
      f.disp[i + 1] = ny;
      touched = true;
    }
  }
  if (touched) {
    f.resting = false;
    f.version += 1;
  }
}

// Advance every spring in `disp`/`vel` by dt seconds. `damping` is the
// damping ratio: below 1 the picture overshoots and wobbles home, 1 settles
// without overshoot. Returns whether anything is still moving.
function stepSprings(disp: Float32Array, vel: Float32Array, dt: number, stiffness: number, damping: number): boolean {
  const k = Math.max(0, stiffness);
  const c = 2 * Math.max(0, damping) * Math.sqrt(k);
  const n = Math.ceil(dt / MAX_STEP);
  const h = dt / n;
  let moving = false;
  for (let i = 0; i < disp.length; i++) {
    let d = disp[i];
    let v = vel[i];
    if (d === 0 && v === 0) continue;
    // Semi-implicit Euler: velocity first, then position from the new velocity.
    for (let s = 0; s < n; s++) {
      v += (-k * d - c * v) * h;
      d += v * h;
    }
    if (Math.abs(d) < REST && Math.abs(v) < REST) {
      d = 0;
      v = 0;
    } else {
      moving = true;
    }
    disp[i] = d;
    vel[i] = v;
  }
  return moving;
}

// Advance the brush's springs by dt seconds; see stepSprings.
export function stepPushField(f: PushField, dt: number, stiffness: number, damping: number): boolean {
  if (f.resting) return false;
  if (dt <= 0) return true;
  const moving = stepSprings(f.disp, f.vel, dt, stiffness, damping);
  f.resting = !moving;
  f.version += 1;
  return moving;
}

// --- strips ------------------------------------------------------------------

export type StripAxis = "rows" | "columns";

// What a push moves. The shape select also offers "random", resolved through
// randomShapeAt to one of these.
export const PUSH_SHAPES = ["brush", "rows", "columns"] as const;
export type PushShape = (typeof PUSH_SHAPES)[number];

// The shape a "random" push is on at time t. Time is cut into holds, each a
// seeded length between minHold and maxHold seconds, and every hold switches
// to one of the two other shapes, so a switch is always visible. Analytic in
// t: the same t always gives the same shape, reload after reload.
export function randomShapeAt(t: number, minHold: number, maxHold: number): PushShape {
  const lo = Math.max(0.05, Math.min(minHold, maxHold));
  const hi = Math.max(lo, minHold, maxHold);
  let shape = Math.floor(seeded(1000) * PUSH_SHAPES.length);
  let end = lo + (hi - lo) * seeded(1001);
  for (let k = 1; t >= end; k++) {
    shape = (shape + 1 + Math.floor(seeded(2000 + k) * (PUSH_SHAPES.length - 1))) % PUSH_SHAPES.length;
    end += lo + (hi - lo) * seeded(1001 + k);
  }
  return PUSH_SHAPES[shape];
}

export interface StripField {
  width: number;
  height: number;
  axis: StripAxis; // rows slide sideways, columns slide up and down
  size: number; // px per strip, across the axis
  offset: Float32Array; // one slide per strip, px; top to bottom or left to right
  vel: Float32Array;
  resting: boolean;
  version: number;
}

export function createStripField(width: number, height: number, axis: StripAxis, size: number): StripField {
  const across = axis === "rows" ? height : width;
  const count = Math.max(1, Math.ceil(across / Math.max(1, size)));
  return {
    width,
    height,
    axis,
    size,
    offset: new Float32Array(count),
    vel: new Float32Array(count),
    resting: true,
    version: 0,
  };
}

// The pointer moved by (dx, dy) and is now at (x, y): the strip under it
// slides by the part of the move along its axis, scaled by strength. A slide
// is capped at half the composition's length that way.
export function pushStrip(f: StripField, x: number, y: number, dx: number, dy: number, strength: number): void {
  const rows = f.axis === "rows";
  const i = Math.floor((rows ? y : x) / f.size);
  const d = (rows ? dx : dy) * strength;
  if (i < 0 || i >= f.offset.length || d === 0) return;
  const cap = (rows ? f.width : f.height) / 2;
  f.offset[i] = Math.max(-cap, Math.min(cap, f.offset[i] + d));
  f.resting = false;
  f.version += 1;
}

// Advance the strips' springs by dt seconds; see stepSprings.
export function stepStripField(f: StripField, dt: number, stiffness: number, damping: number): boolean {
  if (f.resting) return false;
  if (dt <= 0) return true;
  const moving = stepSprings(f.offset, f.vel, dt, stiffness, damping);
  f.resting = !moving;
  f.version += 1;
  return moving;
}

// --- agitators ---------------------------------------------------------------
// Pointers nobody holds: each wanders the composition and pushes like a hand
// would, so the picture keeps getting stirred. A slow seeded wander carries it
// around and a faster, smaller wobble rides on top, so it agitates rather than
// glides. Analytic in t, so a given time is always the same place: reloads
// match, pausing freezes it, and no path state is kept.

export const MAX_AGITATORS = 4;

// Seeded per agitator; never Math.random.
function seeded(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// Agitator i's position at time t, in px from the composition's top-left.
// `pace` is roughly wander cycles per second. The wander stays within 42% of
// the centre on each axis; the wobble adds up to 6% of the shorter side.
export function agitatorAt(
  i: number,
  t: number,
  width: number,
  height: number,
  pace: number,
): { x: number; y: number } {
  const TAU = Math.PI * 2;
  const w = TAU * pace * t;
  const ph = (k: number) => seeded(i * 7 + k + 1) * TAU;
  // Incommensurate rates, nudged per agitator, so paths don't sync up or repeat.
  const r = 1 + 0.37 * i;
  const wander = (a: number, b: number, k: number) =>
    0.7 * Math.sin(w * a * r + ph(k)) + 0.3 * Math.sin(w * b * r + ph(k + 1));
  const wobble = Math.min(width, height) * 0.06;
  return {
    x: width / 2 + 0.42 * width * wander(0.9, 1.73, 0) + wobble * Math.sin(w * 4.1 + ph(4)),
    y: height / 2 + 0.42 * height * wander(1.13, 2.29, 2) + wobble * Math.cos(w * 3.7 + ph(5)),
  };
}
