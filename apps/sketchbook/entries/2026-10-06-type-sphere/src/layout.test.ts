import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findSpans, layoutWords, rowsFor, scaleFor } from "./layout.ts";
import type { LayoutInput } from "./layout.ts";

// Ten px a letter at scale 1, and a dark-to-light ramp across x.
const measure = (w: string) => w.length * 10;
const base: LayoutInput = {
  cx: 200,
  cy: 200,
  radius: 100,
  rowPitch: 20,
  words: ["AB"],
  measure,
  darkness: () => 0.5,
  minScale: 0.2,
  maxScale: 1,
  wordGap: 4,
};
const ramp = (x: number) => 1 - Math.min(1, Math.max(0, (x - 100) / 200)); // 1 at x=100, 0 at x=300

const rowsOf = (words: ReturnType<typeof layoutWords>) => {
  const rows = new Map<number, typeof words>();
  for (const w of words) rows.set(w.y, [...(rows.get(w.y) ?? []), w]);
  return [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([, ws]) => ws);
};

describe("scaleFor", () => {
  it("runs from minScale in the light to maxScale in the dark", () => {
    assert.equal(scaleFor(0, 0.2, 1), 0.2);
    assert.equal(scaleFor(1, 0.2, 1), 1);
    assert.ok(Math.abs(scaleFor(0.5, 0.2, 1) - 0.6) < 1e-12);
  });

  it("clamps darkness outside [0, 1]", () => {
    assert.equal(scaleFor(-3, 0.2, 1), 0.2);
    assert.equal(scaleFor(3, 0.2, 1), 1);
  });
});

describe("rows", () => {
  const placed = layoutWords(base);
  const rows = rowsOf(placed);

  it("fits whole rows of the pitch into the diameter", () => {
    assert.equal(rows.length, 10); // 200 / 20
  });

  it("keeps the pitch constant and the block centred on the sphere", () => {
    const ys = rows.map((r) => r[0].y);
    for (let i = 1; i < ys.length; i++) assert.equal(ys[i] - ys[i - 1], 20);
    assert.equal((ys[0] + ys[ys.length - 1]) / 2, 200);
  });

  it("starts each row at its left limb", () => {
    for (const row of rows) {
      const half = Math.sqrt(100 * 100 - (row[0].y - 200) ** 2);
      assert.ok(Math.abs(row[0].x - (200 - half)) < 1e-9);
    }
  });

  it("covers each row up to its right limb, with only the last word overhanging", () => {
    for (const row of rows) {
      const half = Math.sqrt(100 * 100 - (row[0].y - 200) ** 2);
      for (const w of row) assert.ok(w.x < 200 + half);
      const last = row[row.length - 1];
      assert.ok(last.x + last.width + 4 * last.scale >= 200 + half);
    }
  });

  it("never overlaps words within a row", () => {
    for (const row of rows) {
      for (let i = 1; i < row.length; i++) assert.ok(row[i].x >= row[i - 1].x + row[i - 1].width);
    }
  });

  it("is deterministic", () => {
    assert.deepEqual(layoutWords(base), placed);
  });
});

describe("sizing by darkness", () => {
  it("scales every word by the darkness it lands on", () => {
    for (const d of [0, 0.25, 1]) {
      const words = layoutWords({ ...base, darkness: () => d });
      for (const w of words) assert.ok(Math.abs(w.scale - scaleFor(d, 0.2, 1)) < 1e-9);
    }
  });

  it("keeps a lit word at the floor, never zero", () => {
    const words = layoutWords({ ...base, darkness: () => 0 });
    assert.ok(words.length > 0);
    assert.ok(words.every((w) => w.scale === 0.2));
  });

  it("makes more, smaller words where it is lighter", () => {
    const row = rowsOf(layoutWords({ ...base, darkness: (x) => ramp(x) }))[5];
    assert.ok(row.length > 2);
    for (let i = 1; i < row.length; i++) assert.ok(row[i].scale <= row[i - 1].scale + 1e-9);
    assert.ok(row[0].scale > row[row.length - 1].scale * 2);
  });

  it("sizes a word by the darkness at its centre, not only where it starts", () => {
    // Dark left of x = 150, light right of it. A word starting at x = 100 is
    // dark under the cursor but would straddle the edge.
    const step = (x: number) => (x < 150 ? 1 : 0);
    const first = layoutWords({
      ...base,
      cx: 150,
      cy: 150,
      radius: 50,
      rowPitch: 100,
      words: ["WIDEWORD"],
      darkness: (x) => step(x),
    })[0];
    // Sized at the cursor it is 80 wide and its centre sits at x = 140 (dark),
    // which is self-consistent, so it stays at full scale.
    assert.equal(first.scale, 1);
    const shifted = layoutWords({
      ...base,
      cx: 160,
      cy: 150,
      radius: 50,
      rowPitch: 100,
      words: ["WIDEWORD"],
      darkness: (x) => step(x),
    })[0];
    // Cursor at 110 is dark, but the centre at 150 is not.
    assert.ok(shifted.scale < 1);
  });

  it("passes the words' own darkness the point it sampled", () => {
    const seen: number[] = [];
    layoutWords({ ...base, darkness: (x, y) => (seen.push(x, y), 0.5) });
    assert.ok(seen.length > 0);
    assert.ok(seen.every((v) => Number.isFinite(v)));
  });
});

describe("words", () => {
  it("cycles the list in order along a row", () => {
    const row = rowsOf(layoutWords({ ...base, words: ["A", "BB", "CCC"] }))[0];
    assert.deepEqual(
      row.slice(0, 6).map((w) => w.text),
      ["A", "BB", "CCC", "A", "BB", "CCC"],
    );
  });

  it("starts each row one word further on, so rows never depend on each other", () => {
    const rows = rowsOf(layoutWords({ ...base, words: ["A", "BB", "CCC"] }));
    assert.deepEqual(
      rows.slice(0, 4).map((r) => r[0].text),
      ["A", "BB", "CCC", "A"],
    );
  });

  it("repeats a single word everywhere", () => {
    const words = layoutWords({ ...base, words: ["PIRELLI"] });
    assert.ok(words.every((w) => w.text === "PIRELLI"));
  });

  it("skips words that measure zero, and returns nothing without any", () => {
    const row = rowsOf(layoutWords({ ...base, words: ["", "A"] }))[0];
    assert.ok(row.every((w) => w.text === "A"));
    assert.deepEqual(layoutWords({ ...base, words: [] }), []);
    assert.deepEqual(layoutWords({ ...base, words: [""] }), []);
  });

  it("returns nothing for a degenerate sphere or pitch", () => {
    assert.deepEqual(layoutWords({ ...base, radius: 0 }), []);
    assert.deepEqual(layoutWords({ ...base, rowPitch: 0 }), []);
    assert.deepEqual(layoutWords({ ...base, rowPitch: 500 }), []);
  });

  it("terminates when a word measures almost nothing", () => {
    const words = layoutWords({ ...base, measure: () => 1e-9, wordGap: 0 });
    assert.ok(words.length > 0 && words.length < 100_000);
  });
});

describe("findSpans", () => {
  const bands = (x: number) => (x >= 10 && x <= 20) || (x >= 40 && x <= 60);

  it("finds each run, with edges pinned to a fraction of a pixel", () => {
    const spans = findSpans(bands, 0, 0, 100, 2);
    assert.equal(spans.length, 2);
    for (const [s, [a, b]] of spans.map((s, i) => [s, [[10, 20], [40, 60]][i]] as const)) {
      assert.ok(Math.abs(s.x0 - a) < 0.05 && Math.abs(s.x1 - b) < 0.05, `${s.x0}..${s.x1}`);
    }
  });

  it("closes a span that is still open at either end of the range", () => {
    assert.deepEqual(findSpans(() => true, 0, 5, 50, 3), [{ x0: 5, x1: 50 }]);
    const tail = findSpans((x) => x > 30, 0, 0, 50, 4);
    assert.equal(tail.length, 1);
    assert.ok(Math.abs(tail[0].x0 - 30) < 0.05 && tail[0].x1 === 50);
    const head = findSpans((x) => x < 30, 0, 0, 50, 4);
    assert.equal(head.length, 1);
    assert.ok(head[0].x0 === 0 && Math.abs(head[0].x1 - 30) < 0.05);
  });

  it("finds nothing where nothing is, and survives a degenerate range", () => {
    assert.deepEqual(findSpans(() => false, 0, 0, 100, 1), []);
    assert.deepEqual(findSpans(() => true, 0, 10, 10, 1), []);
    assert.deepEqual(findSpans(() => true, 0, 10, 0, 1), []);
    assert.deepEqual(findSpans(() => true, 0, 0, 10, 0), []);
  });

  it("is told the row it is scanning", () => {
    const ys = new Set<number>();
    findSpans((x, y) => (ys.add(y), x > 5), 7, 0, 10, 1);
    assert.deepEqual([...ys], [7]);
  });
});

describe("rows of a shape that is not a circle", () => {
  // A ring: out to 100 from the centre, with a hole of 50 in the middle.
  const ring = (x: number, y: number) => {
    const r = Math.hypot(x - 200, y - 200);
    return r <= 100 && r >= 50;
  };
  const shape = { ...base, inside: ring };
  const rows = rowsFor(shape);

  it("keeps the same rows as a circle, just cut differently", () => {
    const plain = rowsFor(base);
    assert.equal(rows.length, plain.length);
    assert.deepEqual(rows.map((r) => r.y), plain.map((r) => r.y));
  });

  it("gives rows through the hole two spans, and rows above it one", () => {
    const counts = rows.map((r) => r.spans.length);
    assert.equal(Math.max(...counts), 2);
    assert.equal(counts[0], 1);
    assert.equal(counts[counts.length - 1], 1);
    for (const row of rows.filter((r) => r.spans.length === 2)) {
      const [a, b] = row.spans;
      assert.ok(a.x1 < 200 && b.x0 > 200, "the hole is between them");
      assert.ok(a.x1 < b.x0);
      // The row's own distance from the centre decides the hole's width.
      const hole = Math.sqrt(50 * 50 - (row.y - 200) ** 2);
      assert.ok(Math.abs(a.x1 - (200 - hole)) < 0.05 && Math.abs(b.x0 - (200 + hole)) < 0.05);
    }
  });

  it("leaves a row with nothing in it with no spans", () => {
    const none = rowsFor({ ...base, inside: () => false });
    assert.ok(none.length > 0 && none.every((r) => r.spans.length === 0));
    assert.deepEqual(layoutWords({ ...base, inside: () => false }), []);
  });

  it("sets words in every span and never in the hole", () => {
    const placed = layoutWords({ ...base, rows, words: ["AB", "CDE"] });
    const through = rows.filter((r) => r.spans.length === 2);
    assert.ok(through.length > 0);
    for (const w of placed) {
      assert.ok(w.x >= w.span.x0 && w.x < w.span.x1, `${w.text} at ${w.x}`);
    }
    for (const row of through) {
      for (const span of row.spans) {
        const first = placed.find((w) => w.span === span);
        assert.ok(first && first.x === span.x0, "each span starts at its own left edge");
      }
    }
  });

  it("carries a row's word cycle across its spans", () => {
    const placed = layoutWords({ ...base, rows, words: ["A", "BB", "CCC"] });
    const row = rows.findIndex((r) => r.spans.length === 2);
    const inRow = placed.filter((w) => w.y === rows[row].y);
    assert.equal(inRow[0].text, ["A", "BB", "CCC"][row % 3]);
    for (let i = 1; i < inRow.length; i++) {
      assert.equal(inRow[i].text, ["A", "BB", "CCC"][(row + i) % 3]);
    }
    assert.ok(new Set(inRow.map((w) => w.span)).size === 2);
  });

  it("uses the rows it is handed instead of scanning again", () => {
    let probes = 0;
    const counting = { ...shape, inside: (x: number, y: number) => (probes++, ring(x, y)) };
    const cached = rowsFor(counting);
    const after = probes;
    assert.ok(after > 0);
    layoutWords({ ...counting, rows: cached });
    assert.equal(probes, after);
    assert.deepEqual(layoutWords({ ...counting, rows: cached }), layoutWords(shape));
  });
});
