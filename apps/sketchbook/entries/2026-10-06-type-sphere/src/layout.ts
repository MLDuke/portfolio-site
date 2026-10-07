// Row layout for the type sphere: pure maths, no canvas and no DOM, so it can be
// tested under node:test. The shell hands in a text-measuring function and a
// darkness function; this file decides where every word goes and how big.
//
// Units are CSS pixels from the canvas's top-left. A word's `scale` multiplies
// its natural size: at scale 1 it is as big as a row allows, at scale 0.1 it is
// a tenth of that, still centred on its row's line.
//
// The shape is whatever `inside` says it is. Each row's centre line is scanned
// for the runs of x where the shape is, which are the row's spans: a donut's
// row can have two. With no `inside`, the shape is a circle of `radius`.

export interface Span {
  x0: number;
  x1: number;
}

export interface Row {
  y: number; // centre line of the row
  spans: Span[]; // left to right, never overlapping
}

export interface PlacedWord {
  text: string;
  x: number; // left edge
  y: number; // vertical centre of the row it sits on
  scale: number;
  width: number; // measured width at this scale, without the gap after it
  span: Span; // the run it was set in; the caller clips to it
}

export interface LayoutInput {
  cx: number; // centre of the shape's bounding circle
  cy: number;
  radius: number; // radius of the bounding circle: the shape fits inside it
  inside?: (x: number, y: number) => boolean; // the silhouette; default a circle
  rows?: readonly Row[]; // from rowsFor, if the caller cached them
  rowPitch: number; // distance between row centres; constant down the sphere
  words: readonly string[]; // cycled in order
  measure: (word: string) => number; // width at scale 1
  darkness: (x: number, y: number) => number; // 0..1 at a canvas point
  minScale: number; // scale of a word in full light
  maxScale: number; // scale of a word in full shadow
  wordGap: number; // space after a word at scale 1; shrinks with the word
}

// Scale is linear in darkness. The floor keeps the lit side from vanishing:
// the poster's lightest words are tiny, but they are still words.
export function scaleFor(darkness: number, minScale: number, maxScale: number): number {
  const d = Math.min(1, Math.max(0, darkness));
  return minScale + (maxScale - minScale) * d;
}

// The runs of x in [x0, x1] where `inside` holds along the line at y. It walks at
// `step` and, wherever the answer flips between two steps, bisects the pair to
// pin the edge, so a ragged edge is accurate to a fraction of a pixel. Anything
// narrower than a step can slip through, which at a pixel or two is under a
// letter's stroke.
const BISECT_STEPS = 6;
export function findSpans(
  inside: (x: number, y: number) => boolean,
  y: number,
  x0: number,
  x1: number,
  step = 1,
): Span[] {
  const spans: Span[] = [];
  if (!(x1 > x0) || !(step > 0)) return spans;
  const edge = (out: number, inn: number) => {
    for (let i = 0; i < BISECT_STEPS; i++) {
      const mid = (out + inn) / 2;
      if (inside(mid, y)) inn = mid;
      else out = mid;
    }
    return (out + inn) / 2;
  };
  let was = inside(x0, y);
  let start = x0;
  let prev = x0;
  for (let x = x0 + step; ; x += step) {
    if (x > x1) x = x1;
    const now = inside(x, y);
    if (now && !was) start = edge(prev, x);
    else if (!now && was) spans.push({ x0: start, x1: edge(x, prev) });
    was = now;
    prev = x;
    if (x >= x1) break;
  }
  if (was && x1 > start) spans.push({ x0: start, x1 });
  return spans;
}

// The rows that fit the shape: whole rows of the pitch into the bounding
// circle's diameter, centred on it, each with its spans. A circle (no `inside`)
// gets its exact chords; any other shape is scanned, and only within the
// bounding circle's chord, since nothing is outside it.
export function rowsFor(
  input: Pick<LayoutInput, "cx" | "cy" | "radius" | "rowPitch" | "inside">,
  step = 1,
): Row[] {
  const { cx, cy, radius, rowPitch, inside } = input;
  if (rowPitch <= 0 || radius <= 0) return [];
  const count = Math.floor((2 * radius) / rowPitch);
  const top = cy - (count * rowPitch) / 2 + rowPitch / 2;
  const rows: Row[] = [];
  for (let r = 0; r < count; r++) {
    const y = top + r * rowPitch;
    const dy = y - cy;
    const half = Math.sqrt(Math.max(0, radius * radius - dy * dy));
    const spans = inside
      ? findSpans(inside, y, cx - half, cx + half, step)
      : half > 0
        ? [{ x0: cx - half, x1: cx + half }]
        : [];
    rows.push({ y, spans });
  }
  return rows;
}

// The cursor always moves on by at least this much, so a measure that returns
// something absurdly small can't keep a row from ending.
const MIN_ADVANCE = 0.5;
const SETTLE_STEPS = 3;

// Rows are packed top to bottom at a constant pitch and centred on the shape,
// each one cut into spans by the silhouette. Row r starts with word r % n, then
// cycles on, carrying over from one span to the next. Every span starts at its
// left edge and runs to its right, and a word that begins inside the span is
// placed even if it overhangs the edge, because the caller clips to the span
// when it draws. That reads closest to the poster, whose words march off the
// edge of the disc rather than stopping short of it.
//
// Restarting the cycle on every row, rather than carrying one count down the
// whole shape, is deliberate: the light moves, so words per row change every
// frame, and a single running count would reshuffle every row below.
//
// A word is sized by the darkness where it lands. Its width depends on its
// scale and its scale on where it lands, so the size is settled by a few
// fixed-point steps: size it at the cursor, move to where its centre would be,
// size it again. Each step is averaged with the last, which stops a word
// sitting on a hard edge of light from flipping between big and small.
export function layoutWords(input: LayoutInput): PlacedWord[] {
  const { measure, darkness, minScale, maxScale, wordGap } = input;
  const words = input.words.filter((w) => measure(w) > 0);
  if (words.length === 0) return [];
  const rows = input.rows ?? rowsFor(input);
  const placed: PlacedWord[] = [];

  rows.forEach((row, r) => {
    const y = row.y;
    let i = r;
    for (const span of row.spans) {
      let cursor = span.x0;
      while (cursor < span.x1) {
        const text = words[i % words.length];
        const natural = measure(text);
        let scale = scaleFor(darkness(cursor, y), minScale, maxScale);
        for (let step = 0; step < SETTLE_STEPS; step++) {
          const centre = cursor + (natural * scale) / 2;
          scale = (scale + scaleFor(darkness(centre, y), minScale, maxScale)) / 2;
        }
        const width = natural * scale;
        placed.push({ text, x: cursor, y, scale, width, span });
        cursor += Math.max(MIN_ADVANCE, width + wordGap * scale);
        i++;
      }
    }
  });
  return placed;
}
