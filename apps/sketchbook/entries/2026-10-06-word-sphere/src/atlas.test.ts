import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  chooseMaskMode,
  coverageOf,
  cropMask,
  fitSize,
  inkBounds,
  maskFromRgba,
  median,
  orderByCoverage,
  packTiles,
  subsampleEvenly,
  uniqueChars,
} from "./atlas.ts";

const rgba = (...px: number[][]) => new Uint8ClampedArray(px.flat());

describe("uniqueChars", () => {
  it("keeps first-seen order and drops repeats", () => {
    assert.deepEqual(uniqueChars("MLDUKE"), ["M", "L", "D", "U", "K", "E"]);
    assert.deepEqual(uniqueChars("ABAB BA"), ["A", "B", " "]);
  });

  it("is case sensitive: the text is used as typed", () => {
    assert.deepEqual(uniqueChars("aA"), ["a", "A"]);
  });

  it("folds every kind of whitespace into one space", () => {
    assert.deepEqual(uniqueChars("a \t\nb"), ["a", " ", "b"]);
  });

  it("keeps an astral character whole", () => {
    assert.deepEqual(uniqueChars("a\u{1F600}a"), ["a", "\u{1F600}"]);
  });

  it("stops at the cap", () => {
    assert.deepEqual(uniqueChars("abcdef", 3), ["a", "b", "c"]);
  });

  it("is empty for empty text", () => assert.deepEqual(uniqueChars(""), []));
});

describe("orderByCoverage", () => {
  it("sorts ascending, lightest first", () => {
    assert.deepEqual(orderByCoverage([".", "#", ":"], [0.1, 0.9, 0.4]), [".", ":", "#"]);
  });

  it("keeps the original order for ties, so it is stable across runs", () => {
    assert.deepEqual(orderByCoverage(["b", "a", "c"], [0.5, 0.5, 0.5]), ["b", "a", "c"]);
  });

  it("puts a blank glyph first", () => {
    assert.deepEqual(orderByCoverage(["@", " ", "."], [0.6, 0, 0.1]), [" ", ".", "@"]);
  });

  it("does not mutate its input", () => {
    const chars = ["b", "a"];
    orderByCoverage(chars, [1, 0]);
    assert.deepEqual(chars, ["b", "a"]);
  });
});

describe("subsampleEvenly", () => {
  it("returns a short list as is", () => assert.deepEqual(subsampleEvenly([1, 2, 3], 5), [1, 2, 3]));

  it("keeps the first and last and spreads the rest", () => {
    const out = subsampleEvenly([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 4);
    assert.equal(out.length, 4);
    assert.equal(out[0], 0);
    assert.equal(out[3], 9);
    assert.deepEqual(out, [...out].sort((a, b) => a - b));
  });

  it("copes with a limit of one", () => assert.deepEqual(subsampleEvenly([5, 6, 7], 1), [5]));
});

describe("coverageOf", () => {
  it("is the share of covered texels", () => {
    assert.equal(coverageOf(new Uint8Array([255, 0, 255, 0])), 0.5);
    assert.equal(coverageOf(new Uint8Array(8)), 0);
    assert.equal(coverageOf(new Uint8Array([255, 255])), 1);
  });

  it("is 0 for an empty mask", () => assert.equal(coverageOf(new Uint8Array(0)), 0));
});

describe("chooseMaskMode", () => {
  it("uses alpha when the image has real transparency", () => {
    const px = Array.from({ length: 10 }, (_, i) => (i < 4 ? [0, 0, 0, 0] : [0, 0, 0, 255]));
    assert.equal(chooseMaskMode(rgba(...px)), "alpha");
  });

  it("uses luminance for an opaque image", () => {
    assert.equal(chooseMaskMode(rgba([0, 0, 0, 255], [255, 255, 255, 255])), "luminance");
  });

  it("ignores a stray translucent pixel", () => {
    const px = Array.from({ length: 100 }, (_, i) => (i === 0 ? [0, 0, 0, 100] : [9, 9, 9, 255]));
    assert.equal(chooseMaskMode(rgba(...px)), "luminance");
  });

  it("treats an empty image as luminance", () => assert.equal(chooseMaskMode(rgba()), "luminance"));
});

describe("maskFromRgba", () => {
  it("copies alpha in alpha mode, whatever the colour", () => {
    assert.deepEqual([...maskFromRgba(rgba([255, 255, 255, 0], [0, 0, 0, 128], [9, 9, 9, 255]), "alpha")], [0, 128, 255]);
  });

  it("inks the dark and leaves the light in luminance mode", () => {
    assert.deepEqual([...maskFromRgba(rgba([0, 0, 0, 255], [255, 255, 255, 255]), "luminance")], [255, 0]);
  });

  it("weights channels by perception: green is lighter than blue", () => {
    const [green, blue] = maskFromRgba(rgba([0, 255, 0, 255], [0, 0, 255, 255]), "luminance");
    assert.ok(green < blue);
  });

  it("counts a transparent pixel as paper in luminance mode", () => {
    assert.deepEqual([...maskFromRgba(rgba([0, 0, 0, 0]), "luminance")], [0]);
  });
});

describe("inkBounds", () => {
  // 5 wide, 4 high, ink at (1,1), (3,2).
  const mask = new Uint8Array(20);
  mask[1 * 5 + 1] = 255;
  mask[2 * 5 + 3] = 200;

  it("is the smallest box around the ink", () => {
    assert.deepEqual(inkBounds(mask, 5, 4), { x: 1, y: 1, w: 3, h: 2 });
  });

  it("is null for a blank mask", () => assert.equal(inkBounds(new Uint8Array(20), 5, 4), null));

  it("ignores faint noise below the threshold", () => {
    const faint = new Uint8Array(20);
    faint[0] = 5;
    assert.equal(inkBounds(faint, 5, 4), null);
    assert.deepEqual(inkBounds(faint, 5, 4, 0), { x: 0, y: 0, w: 1, h: 1 });
  });
});

describe("cropMask", () => {
  const mask = Uint8Array.from({ length: 20 }, (_, i) => i + 1); // 5 x 4

  it("copies the box", () => {
    const out = cropMask(mask, 5, { x: 1, y: 1, w: 3, h: 2 });
    assert.equal(out.width, 3);
    assert.equal(out.height, 2);
    assert.deepEqual([...out.mask], [7, 8, 9, 12, 13, 14]);
  });

  it("surrounds it with an empty margin", () => {
    const out = cropMask(mask, 5, { x: 0, y: 0, w: 2, h: 1 }, 1, 1);
    assert.equal(out.width, 4);
    assert.equal(out.height, 3);
    assert.deepEqual([...out.mask], [0, 0, 0, 0, 0, 1, 2, 0, 0, 0, 0, 0]);
  });
});

describe("packTiles", () => {
  it("lays equal tiles side by side, row by row", () => {
    const a = Uint8Array.from([1, 2, 3, 4]); // 2 x 2
    const b = Uint8Array.from([5, 6, 7, 8]);
    assert.deepEqual([...packTiles([a, b], 2, 2)], [1, 2, 5, 6, 3, 4, 7, 8]);
  });

  it("is empty for no tiles", () => assert.equal(packTiles([], 2, 2).length, 0));
});

describe("fitSize", () => {
  it("shrinks the longer side to the limit, keeping the aspect ratio", () => {
    assert.deepEqual(fitSize(2000, 1000, 500), { w: 500, h: 250 });
    assert.deepEqual(fitSize(300, 900, 450), { w: 150, h: 450 });
  });

  it("never grows a small image", () => assert.deepEqual(fitSize(40, 20, 500), { w: 40, h: 20 }));

  it("never collapses to nothing", () => assert.deepEqual(fitSize(10000, 1, 100), { w: 100, h: 1 }));
});

describe("median", () => {
  it("takes the middle, or the mean of the middle two", () => {
    assert.equal(median([3, 1, 2]), 2);
    assert.equal(median([4, 1, 3, 2]), 2.5);
    assert.equal(median([]), 0);
  });
});
