import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cellAt,
  cellInk,
  cellWidthPx,
  easeLight,
  inkOf,
  lightFromAngles,
  inkAt,
  lightSettled,
  markScale,
  MAX_ROW_CELLS,
  NO_CELL,
  packedCellAt,
  packedHalfRows,
  packedLayout,
  packedRow,
  pointerToLight,
  rampIndex,
  shade,
  sphereNormal,
  sphereRadiusPx,
} from "./sphere.ts";
import type { GridInput, PackedInput, Shading, Tone, Vec3 } from "./sphere.ts";

const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} is not ${b}`);
const nearVec = (a: Vec3, b: Vec3, eps = 1e-9) => a.forEach((v, i) => near(v, b[i], eps));
const len = (v: Vec3) => Math.hypot(v[0], v[1], v[2]);

const plain: Shading = { ambient: 0, diffuse: 1, specular: 0, shininess: 32, rim: 0 };
const poster: Tone = { invert: true, gamma: 1, contrast: 1 };

describe("lightFromAngles", () => {
  it("points at the viewer at 0, 0", () => nearVec(lightFromAngles(0, 0), [0, 0, 1]));
  it("comes from the right at azimuth 90", () => nearVec(lightFromAngles(90, 0), [1, 0, 0]));
  it("comes from the left at azimuth -90", () => nearVec(lightFromAngles(-90, 0), [-1, 0, 0]));
  it("comes from behind at azimuth 180", () => nearVec(lightFromAngles(180, 0), [0, 0, -1]));
  it("comes from above at elevation 90", () => nearVec(lightFromAngles(37, 90), [0, 1, 0]));
  it("is always a unit vector", () => {
    for (const [az, el] of [[65, 15], [-120, 40], [10, -70]]) near(len(lightFromAngles(az, el)), 1);
  });
});

describe("pointerToLight", () => {
  const at = (x: number, y: number) => pointerToLight(x, y, 200, 200, 100);

  it("puts the light on the viewer when the pointer is over the centre", () => {
    nearVec(at(200, 200), [0, 0, 1]);
  });

  it("puts it over the point of the sphere under the pointer", () => {
    // Canvas y runs down, light y runs up: a pointer above centre lights from above.
    nearVec(at(250, 200), [0.5, 0, Math.sqrt(0.75)]);
    nearVec(at(200, 150), [0, 0.5, Math.sqrt(0.75)]);
  });

  it("sits on the horizon at the rim", () => {
    nearVec(at(300, 200), [1, 0, 0]);
  });

  it("stays on the horizon, in the same direction, beyond the rim", () => {
    nearVec(at(500, 200), [1, 0, 0]);
    const d = at(300, 100); // 45 degrees up and right, past the rim
    near(d[2], 0);
    near(d[0], Math.SQRT1_2);
    near(d[1], Math.SQRT1_2);
  });

  it("never gives a non-unit vector", () => {
    for (const [x, y] of [[0, 0], [190, 230], [260, 140], [400, 400]]) near(len(at(x, y)), 1);
  });
});

describe("easeLight", () => {
  const home: Vec3 = [0, 0, 1];
  const away: Vec3 = [1, 0, 0];

  it("does not move for zero time", () => nearVec(easeLight(home, away, 0, 7), home));

  it("closes part of the gap, along the arc, as a unit vector", () => {
    const a = easeLight(home, away, 0.1, 7);
    near(len(a), 1);
    assert.ok(a[0] > 0 && a[2] < 1 && a[0] < 1);
  });

  it("arrives: a long step lands on the target", () => {
    nearVec(easeLight(home, away, 10, 7), away, 1e-6);
  });

  it("snaps to the target rather than averaging exact opposites to nothing", () => {
    // After ln(2)/rate seconds the ease is exactly halfway: the zero vector.
    nearVec(easeLight([0, 0, 1], [0, 0, -1], Math.LN2 / 7, 7), [0, 0, -1]);
  });

  it("settles", () => {
    assert.equal(lightSettled(home, home), true);
    assert.equal(lightSettled(home, away), false);
    assert.equal(lightSettled(home, easeLight(home, away, 10, 7)), false);
    assert.equal(lightSettled(away, easeLight(home, away, 10, 7)), true);
  });
});

describe("sphereNormal", () => {
  it("faces the viewer at the centre", () => nearVec(sphereNormal(100, 100, 100, 100, 50), [0, 0, 1]));

  it("tilts to the right on the right half and up on the upper half", () => {
    const n = sphereNormal(125, 75, 100, 100, 50);
    near(n[0], 0.5);
    near(n[1], 0.5);
    near(len(n), 1);
  });

  it("is pulled onto the rim for a point beyond it", () => {
    const n = sphereNormal(400, 100, 100, 100, 50);
    near(len(n), 1);
    assert.ok(n[0] > 0.99 && n[2] >= 0);
  });
});

describe("shade", () => {
  const front: Vec3 = [0, 0, 1];

  it("is full where the normal meets the light and zero facing away", () => {
    near(shade(front, front, plain), 1);
    near(shade([-1, 0, 0], [1, 0, 0], plain), 0);
  });

  it("follows Lambert's cosine", () => {
    near(shade(front, lightFromAngles(60, 0), plain), 0.5, 1e-9);
  });

  it("keeps ambient in shadow", () => {
    near(shade([-1, 0, 0], [1, 0, 0], { ...plain, ambient: 0.1 }), 0.1);
  });

  it("clamps to [0,1]", () => {
    near(shade(front, front, { ...plain, ambient: 0.5 }), 1);
  });

  it("adds a highlight where the normal bisects light and viewer", () => {
    const light = lightFromAngles(60, 0);
    const half: Vec3 = [Math.sin(Math.PI / 6), 0, Math.cos(Math.PI / 6)]; // 30 degrees: halfway
    const flat = shade(half, light, plain);
    const shiny = shade(half, light, { ...plain, diffuse: 0.5, specular: 0.5 });
    near(shiny, 0.5 * flat + 0.5, 1e-9);
  });

  it("adds rim light only at the silhouette", () => {
    const withRim = { ...plain, diffuse: 0, rim: 1 };
    near(shade(front, front, withRim), 0);
    near(shade([1, 0, 0], front, withRim), 1);
  });
});

describe("inkOf", () => {
  it("inks the shadow when inverted, the light when not", () => {
    near(inkOf(0.2, poster), 0.8);
    near(inkOf(0.2, { ...poster, invert: false }), 0.2);
  });

  it("pivots contrast on mid grey", () => {
    near(inkOf(0.5, { ...poster, contrast: 2 }), 0.5);
    near(inkOf(0.4, { ...poster, contrast: 2 }), 0.7);
    near(inkOf(0.0, { ...poster, contrast: 3 }), 1);
  });

  it("thins the middle with gamma above 1", () => {
    near(inkOf(0.5, { ...poster, gamma: 2 }), 0.25);
  });
});

describe("marks", () => {
  it("scale runs from minScale to full size", () => {
    near(markScale(0, 0.2), 0.2);
    near(markScale(1, 0.2), 1);
    near(markScale(0.5, 0.2), 0.6);
  });

  it("ramp picks an index from ink, ending on the last", () => {
    assert.equal(rampIndex(0, 5), 0);
    assert.equal(rampIndex(0.39, 5), 1);
    assert.equal(rampIndex(0.4, 5), 2);
    assert.equal(rampIndex(1, 5), 4);
    assert.equal(rampIndex(2, 5), 4);
    assert.equal(rampIndex(0.7, 1), 0);
  });

  it("a cell is as wide as its mark at full size, times cellWidth", () => {
    near(cellWidthPx(10, 0.8, 4, 1), 32);
    near(cellWidthPx(10, 0.8, 4, 1.5), 48);
  });
});

describe("sphereRadiusPx", () => {
  // Marks 10.4 px tall and 54 px wide at full size (13 * 0.8, aspect 5.2).
  const fit = (fraction: number, w: number, h: number) => sphereRadiusPx(fraction, w, h, 13, 0.8, 5.2);

  it("is the dial's share of the shorter side when there is room", () => {
    near(fit(0.46, 1100, 620), 0.46 * 620);
    near(fit(0.3, 900, 600), 0.3 * 600);
  });

  it("leaves room for a full-size mark past the right rim", () => {
    const r = fit(0.5, 400, 800); // width is the short side: 0.5 * 400 would touch both edges
    assert.ok(200 + r + 13 * 0.8 * 5.2 <= 400);
  });

  it("leaves room for half a mark above and below the top and bottom rows", () => {
    const r = fit(0.5, 1200, 400);
    assert.ok(r + (13 * 0.8) / 2 <= 200);
  });

  it("keeps the whole default sphere inside the default stage at any width", () => {
    for (const w of [320, 480, 640, 800, 944, 1167, 1600]) {
      const r = fit(0.46, w, 620);
      assert.ok(w / 2 + r + 13 * 0.8 * 5.2 <= w, `width ${w}`);
      assert.ok(r + (13 * 0.8) / 2 <= 310, `width ${w}`);
      assert.ok(r >= 1);
    }
  });

  it("never goes below 1", () => near(fit(0.5, 10, 10), 1));
});

describe("cellAt", () => {
  const grid: GridInput = {
    cx: 300,
    cy: 200,
    radius: 100,
    rowHeight: 20,
    cellWidth: 40,
    stagger: 0,
    alignLeft: true,
  };

  it("centres a row on the sphere's centre", () => {
    const c = cellAt(300, 200, grid);
    assert.equal(c.row, 0);
    near(c.centreY, 200);
    // Row 0 spans y in [190, 210).
    assert.equal(cellAt(300, 209, grid).row, 0);
    assert.equal(cellAt(300, 190, grid).row, 0);
    assert.equal(cellAt(300, 211, grid).row, 1);
    assert.equal(cellAt(300, 189, grid).row, -1);
  });

  it("spaces rows evenly and symmetrically about the midline", () => {
    near(cellAt(300, 200 + 3 * 20, grid).centreY, 260);
    near(cellAt(300, 200 - 3 * 20, grid).centreY, 140);
  });

  it("starts each row on the circle's edge at that row when aligned", () => {
    near(cellAt(200, 200, grid).anchorX, 200); // the equator: the full radius
    const row3 = cellAt(300, 260, grid); // 60 px off the equator: chord half-width 80
    near(row3.anchorX - row3.col * 40, 220);
    assert.equal(cellAt(210, 260, grid).inside, false); // left of the circle
    assert.equal(cellAt(230, 260, grid).col, 0);
    assert.equal(cellAt(230, 260, grid).inside, true);
  });

  it("starts every row on the bounding edge when not aligned", () => {
    const g = { ...grid, alignLeft: false };
    near(cellAt(300, 260, g).anchorX - cellAt(300, 260, g).col * 40, 200);
    near(cellAt(300, 200, g).anchorX - cellAt(300, 200, g).col * 40, 200);
  });

  it("advances one cell width at a time", () => {
    const a = cellAt(205, 200, grid);
    const b = cellAt(245, 200, grid);
    assert.equal(b.col, a.col + 1);
    near(b.anchorX - a.anchorX, 40);
    near(a.centreX, a.anchorX + 20);
  });

  it("shifts odd rows by the stagger fraction of a cell", () => {
    const g = { ...grid, stagger: 0.5, alignLeft: false };
    const even = cellAt(300, 200, g);
    const odd = cellAt(300, 220, g);
    near((odd.anchorX - even.anchorX + 40) % 40, 20);
    const above = cellAt(300, 180, g); // row -1 is odd too
    near((above.anchorX - even.anchorX + 40) % 40, 20);
  });

  it("leaves rows beyond the sphere empty", () => {
    assert.equal(cellAt(300, 200 + 6 * 20, grid).inside, false);
    assert.equal(cellAt(300, 200 - 6 * 20, grid).inside, false);
  });

  it("keeps an overhanging cell whose anchor is inside the sphere", () => {
    // 60 px below the equator the circle spans x 220..380 and cells start at 220,
    // 260, ... 380. The last starts on the rim and its mark runs on to 420.
    const open = grid;
    const c = cellAt(390, 260, open);
    near(c.anchorX, 380);
    assert.equal(c.inside, true);
    assert.equal(cellAt(430, 260, open).inside, false); // anchor 420: past the rim
  });
});

describe("cellInk", () => {
  const grid: GridInput = {
    cx: 300,
    cy: 200,
    radius: 100,
    rowHeight: 20,
    cellWidth: 20,
    stagger: 0,
    alignLeft: true,
  };
  const light = lightFromAngles(90, 0); // from the right

  it("is heavy on the shadow side and light on the lit side", () => {
    const left = cellInk(cellAt(215, 200, grid), grid, light, plain, poster);
    const right = cellInk(cellAt(385, 200, grid), grid, light, plain, poster);
    assert.ok(left > 0.9, `left ${left}`);
    assert.ok(right < 0.1, `right ${right}`);
  });

  it("is deterministic", () => {
    const c = cellAt(250, 230, grid);
    assert.equal(cellInk(c, grid, light, plain, poster), cellInk(c, grid, light, plain, poster));
  });

  it("falls away monotonically from shadow to light along the equator", () => {
    const inks: number[] = [];
    for (let x = 205; x < 390; x += 20) inks.push(cellInk(cellAt(x, 200, grid), grid, light, plain, poster));
    for (let i = 1; i < inks.length; i++) assert.ok(inks[i] <= inks[i - 1] + 1e-12, `step ${i}`);
  });
});

describe("packed rows", () => {
  const g: PackedInput = {
    cx: 300,
    cy: 200,
    radius: 100,
    rowHeight: 20,
    fullWidth: 40,
    cellWidth: 1,
    minScale: 0.3,
    alignLeft: true,
  };
  const light = lightFromAngles(60, 10); // from the right, a little above
  const cellsOf = (row: number, input = g) => {
    const out = new Float32Array(MAX_ROW_CELLS * 2);
    const n = packedRow(row, input, light, plain, poster, out, 0);
    return { n, out };
  };
  const anchor = (c: { out: Float32Array }, k: number) => c.out[k * 2];
  const pitch = (c: { out: Float32Array }, k: number) => c.out[k * 2 + 1];

  it("has a row for every line the sphere covers, centre included", () => {
    assert.equal(packedHalfRows(100, 20), 5);
    const layout = packedLayout(g, light, plain, poster);
    assert.equal(layout.rows, 11);
    assert.equal(layout.data.length, 11 * MAX_ROW_CELLS * 2);
  });

  it("starts each row on the circle's edge at that row", () => {
    near(anchor(cellsOf(0), 0), 200);
    near(anchor(cellsOf(3), 0), 220); // 60 px off the equator: half chord 80
    near(anchor(cellsOf(-3), 0), 220);
  });

  it("starts every row on the bounding edge when not aligned, keeping only cells inside the sphere", () => {
    near(anchor(cellsOf(0, { ...g, alignLeft: false }), 0), 200);
    const high = cellsOf(3, { ...g, alignLeft: false });
    assert.ok(high.n > 0);
    assert.ok(anchor(high, 0) > 200, "the cells that start outside the circle are dropped");
    assert.ok(Math.hypot(anchor(high, 0) - 300, 60) <= 100.75);
  });

  it("lays cells end to end: each starts where the last one's pitch ends", () => {
    const c = cellsOf(0);
    assert.ok(c.n > 3);
    for (let k = 1; k < c.n; k++) near(anchor(c, k), anchor(c, k - 1) + pitch(c, k - 1), 1e-3);
  });

  it("makes each cell as wide as the mark drawn from its own centre's ink", () => {
    const c = cellsOf(0);
    for (let k = 0; k < c.n; k++) {
      const centre = anchor(c, k) + pitch(c, k) / 2;
      const w = g.fullWidth * markScale(inkAt(centre, 200, g, light, plain, poster), g.minScale);
      near(pitch(c, k), w, 0.01);
    }
  });

  it("shrinks words toward the light, between full size and minScale", () => {
    const c = cellsOf(0);
    assert.ok(pitch(c, 0) <= g.fullWidth + 1e-3);
    assert.ok(pitch(c, 0) > 0.9 * g.fullWidth, "full size on the shadow side");
    assert.ok(pitch(c, c.n - 1) < pitch(c, 0) * 0.6, "small on the lit side");
    assert.ok(pitch(c, c.n - 1) >= g.fullWidth * g.minScale - 1e-3);
  });

  it("scales the pitch, not the word, with the cellWidth dial", () => {
    const tight = cellsOf(0);
    const loose = cellsOf(0, { ...g, cellWidth: 1.5 });
    near(pitch(loose, 0), pitch(tight, 0) * 1.5, 0.05);
    assert.ok(loose.n < tight.n);
  });

  it("stops at the far rim and fills the rest of the row with empty slots", () => {
    const c = cellsOf(0);
    for (let k = 0; k < c.n; k++) assert.ok(anchor(c, k) <= 400.75);
    assert.ok(anchor(c, c.n - 1) + pitch(c, c.n - 1) > 400, "the last cell starts inside and runs past the rim");
    for (let k = c.n; k < MAX_ROW_CELLS; k++) assert.equal(anchor(c, k), NO_CELL);
  });

  it("is empty beyond the sphere", () => {
    assert.equal(cellsOf(6).n, 0);
    assert.equal(cellsOf(-6).n, 0);
  });

  it("caps a row at MAX_ROW_CELLS", () => {
    assert.equal(cellsOf(0, { ...g, fullWidth: 0.5, minScale: 1 }).n, MAX_ROW_CELLS);
  });

  it("is deterministic and reuses a buffer it is given", () => {
    const a = packedLayout(g, light, plain, poster);
    const b = packedLayout(g, light, plain, poster, a.data);
    assert.equal(b.data, a.data);
    assert.deepEqual([...b.data], [...packedLayout(g, light, plain, poster).data]);
  });

  describe("packedCellAt", () => {
    const layout = packedLayout(g, light, plain, poster);
    const c = cellsOf(0);

    it("finds the cell under a point", () => {
      const k = 2;
      const hit = packedCellAt(anchor(c, k) + pitch(c, k) / 2, 205, g, layout);
      assert.ok(hit);
      assert.equal(hit.row, 0);
      assert.equal(hit.col, k);
      near(hit.anchorX, anchor(c, k), 1e-3);
    });

    it("hits the first cell at its anchor and the next one at the seam", () => {
      assert.equal(packedCellAt(anchor(c, 0) + 0.01, 200, g, layout)?.col, 0);
      assert.equal(packedCellAt(anchor(c, 1) + 0.01, 200, g, layout)?.col, 1);
      assert.equal(packedCellAt(anchor(c, 1) - 0.01, 200, g, layout)?.col, 0);
    });

    it("misses left of the first cell, past the last, and off the rows", () => {
      assert.equal(packedCellAt(anchor(c, 0) - 1, 200, g, layout), null);
      assert.equal(packedCellAt(anchor(c, c.n - 1) + pitch(c, c.n - 1) + 1, 200, g, layout), null);
      assert.equal(packedCellAt(300, 200 + 6 * 20, g, layout), null);
      assert.equal(packedCellAt(300, 200 - 6 * 20, g, layout), null);
    });

    it("agrees with the fixed grid's row numbering", () => {
      assert.equal(packedCellAt(300, 209, g, layout)?.row, 0);
      assert.equal(packedCellAt(300, 189, g, layout)?.row, -1);
      assert.equal(packedCellAt(300, 211, g, layout)?.row, 1);
    });
  });
});
