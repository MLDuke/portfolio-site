import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  agitatorAt,
  createPushField,
  createStripField,
  MAX_AGITATORS,
  pushAt,
  PUSH_CELL,
  PUSH_SHAPES,
  pushStrip,
  randomShapeAt,
  stepPushField,
  stepStripField,
} from "./push.ts";
import type { PushField } from "./push.ts";

// Displacement of the cell whose centre is nearest (x, y).
function dispAt(f: PushField, x: number, y: number): [number, number] {
  const i = (Math.floor(y / PUSH_CELL) * f.cols + Math.floor(x / PUSH_CELL)) * 2;
  return [f.disp[i], f.disp[i + 1]];
}

function maxAbs(a: Float32Array): number {
  return a.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
}

// Run the springs at 60 fps for `seconds`; returns whether they were still moving.
function settle(f: PushField, seconds: number, stiffness = 60, damping = 0.35): boolean {
  let moving = true;
  for (let i = 0; i < seconds * 60; i++) moving = stepPushField(f, 1 / 60, stiffness, damping);
  return moving;
}

describe("createPushField", () => {
  it("covers the composition in PUSH_CELL cells, rounding up", () => {
    const f = createPushField(805, 400);
    assert.equal(f.cols, Math.ceil(805 / PUSH_CELL));
    assert.equal(f.rows, 400 / PUSH_CELL);
    assert.equal(f.disp.length, f.cols * f.rows * 2);
  });

  it("starts at rest, and stepping a resting field is a no-op", () => {
    const f = createPushField(400, 200);
    assert.equal(f.resting, true);
    assert.equal(stepPushField(f, 1 / 60, 60, 0.35), false);
    assert.equal(f.version, 0);
    assert.equal(maxAbs(f.disp), 0);
  });
});

describe("pushAt", () => {
  it("carries cells under the pointer in the drag direction", () => {
    const f = createPushField(400, 200);
    pushAt(f, 200, 100, 10, 0, 40, 1);
    const [dx, dy] = dispAt(f, 200, 100);
    assert.ok(dx > 8 && dx <= 10, `centre moved ${dx}`);
    assert.equal(dy, 0);
    assert.equal(f.resting, false);
    assert.equal(f.version, 1);
  });

  it("falls off with distance and leaves cells beyond the radius alone", () => {
    const f = createPushField(400, 200);
    pushAt(f, 200, 100, 10, 0, 40, 1);
    const centre = dispAt(f, 200, 100)[0];
    const mid = dispAt(f, 220, 100)[0];
    assert.ok(mid > 0 && mid < centre);
    assert.deepEqual(dispAt(f, 260, 100), [0, 0]);
    assert.deepEqual(dispAt(f, 20, 20), [0, 0]);
  });

  it("does nothing at zero strength or without movement", () => {
    const f = createPushField(400, 200);
    pushAt(f, 200, 100, 10, 0, 40, 0);
    pushAt(f, 200, 100, 0, 0, 40, 1);
    assert.equal(f.resting, true);
    assert.equal(f.version, 0);
  });

  it("caps displacement at twice the radius", () => {
    const f = createPushField(400, 200);
    for (let i = 0; i < 50; i++) pushAt(f, 200, 100, 30, 0, 40, 1);
    assert.ok(maxAbs(f.disp) <= 80 + 1e-4);
  });

  it("clips the brush at the field's edges", () => {
    const f = createPushField(400, 200);
    pushAt(f, 0, 0, 5, 5, 40, 1);
    pushAt(f, 1000, 1000, 5, 5, 40, 1); // wholly outside: no cell touched
    assert.ok(dispAt(f, 0, 0)[0] > 0);
    assert.equal(f.version, 1);
  });
});

describe("stepPushField", () => {
  it("springs every cell back to exactly zero and reports rest", () => {
    const f = createPushField(400, 200);
    pushAt(f, 200, 100, 20, -10, 40, 1);
    assert.equal(settle(f, 0.1), true);
    assert.equal(settle(f, 10), false);
    assert.equal(f.resting, true);
    assert.equal(maxAbs(f.disp), 0);
    assert.equal(maxAbs(f.vel), 0);
  });

  it("overshoots when underdamped, and not when critically damped", () => {
    const wobbly = createPushField(400, 200);
    const firm = createPushField(400, 200);
    pushAt(wobbly, 200, 100, 10, 0, 40, 1);
    pushAt(firm, 200, 100, 10, 0, 40, 1);
    let wobblyMin = Infinity;
    let firmMin = Infinity;
    for (let i = 0; i < 120; i++) {
      stepPushField(wobbly, 1 / 60, 60, 0.2);
      stepPushField(firm, 1 / 60, 60, 1);
      wobblyMin = Math.min(wobblyMin, dispAt(wobbly, 200, 100)[0]);
      firmMin = Math.min(firmMin, dispAt(firm, 200, 100)[0]);
    }
    assert.ok(wobblyMin < -1, `wobbly bottomed out at ${wobblyMin}`);
    assert.ok(firmMin >= 0, `firm bottomed out at ${firmMin}`);
  });

  it("stays stable at the top of the stiffness dial and a long frame", () => {
    const f = createPushField(400, 200);
    pushAt(f, 200, 100, 30, 30, 80, 1);
    for (let i = 0; i < 30; i++) stepPushField(f, 0.1, 400, 0.05);
    assert.ok(Number.isFinite(maxAbs(f.disp)));
    assert.ok(maxAbs(f.disp) <= 60, `grew to ${maxAbs(f.disp)}`);
  });

  it("reports moving on a zero-length step without changing anything", () => {
    const f = createPushField(400, 200);
    pushAt(f, 200, 100, 10, 0, 40, 1);
    const before = Float32Array.from(f.disp);
    assert.equal(stepPushField(f, 0, 60, 0.35), true);
    assert.deepEqual(f.disp, before);
  });
});

describe("agitatorAt", () => {
  it("is a pure function of time", () => {
    assert.deepEqual(agitatorAt(1, 3.7, 800, 400, 0.12), agitatorAt(1, 3.7, 800, 400, 0.12));
  });

  it("stays inside the composition", () => {
    for (let i = 0; i < MAX_AGITATORS; i++) {
      for (let t = 0; t < 120; t += 0.37) {
        const { x, y } = agitatorAt(i, t, 800, 400, 0.12);
        // 42% wander plus a wobble of 6% of the shorter side (24 px).
        assert.ok(x >= 800 * 0.08 - 24 && x <= 800 * 0.92 + 24, `x ${x}`);
        assert.ok(y >= 400 * 0.08 - 24 && y <= 400 * 0.92 + 24, `y ${y}`);
      }
    }
  });

  it("moves continuously, a few px per frame at the default pace", () => {
    let max = 0;
    for (let t = 0; t < 30; t += 1 / 60) {
      const a = agitatorAt(0, t, 800, 400, 0.12);
      const b = agitatorAt(0, t + 1 / 60, 800, 400, 0.12);
      max = Math.max(max, Math.hypot(b.x - a.x, b.y - a.y));
    }
    assert.ok(max > 0.5 && max < 20, `max step ${max}`);
  });

  it("gives each agitator its own path", () => {
    const a = agitatorAt(0, 5, 800, 400, 0.12);
    const b = agitatorAt(1, 5, 800, 400, 0.12);
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > 1);
  });

  it("holds still at zero pace", () => {
    assert.deepEqual(agitatorAt(2, 0, 800, 400, 0), agitatorAt(2, 50, 800, 400, 0));
  });
});

describe("strips", () => {
  it("cuts the composition into strips across the axis, rounding up", () => {
    assert.equal(createStripField(800, 400, "rows", 48).offset.length, Math.ceil(400 / 48));
    assert.equal(createStripField(800, 400, "columns", 48).offset.length, Math.ceil(800 / 48));
  });

  it("slides only the row under the pointer, and only sideways", () => {
    const f = createStripField(800, 400, "rows", 32);
    pushStrip(f, 500, 100, 12, 40, 1); // y 100 is strip 3 (96..128)
    assert.equal(f.offset[3], 12);
    assert.equal(f.offset[2], 0);
    assert.equal(f.offset[4], 0);
    assert.equal(f.resting, false);
  });

  it("slides a column by the vertical part of the move", () => {
    const f = createStripField(800, 400, "columns", 32);
    pushStrip(f, 100, 300, 40, -6, 2);
    assert.equal(f.offset[3], -12);
  });

  it("ignores moves along the wrong axis and points outside", () => {
    const f = createStripField(800, 400, "rows", 32);
    pushStrip(f, 500, 100, 0, 40, 1);
    pushStrip(f, 500, -5, 10, 0, 1);
    pushStrip(f, 500, 420, 10, 0, 1); // 13 strips cover 0..416
    assert.equal(f.resting, true);
    assert.equal(f.version, 0);
  });

  it("caps a slide at half the composition", () => {
    const f = createStripField(800, 400, "rows", 32);
    for (let i = 0; i < 100; i++) pushStrip(f, 10, 10, 50, 0, 1);
    assert.equal(f.offset[0], 400);
  });

  it("springs back to rest like the brush", () => {
    const f = createStripField(800, 400, "rows", 32);
    pushStrip(f, 10, 10, 50, 0, 1);
    for (let i = 0; i < 600; i++) stepStripField(f, 1 / 60, 60, 0.35);
    assert.equal(stepStripField(f, 1 / 60, 60, 0.35), false);
    assert.equal(maxAbs(f.offset), 0);
  });
});

describe("randomShapeAt", () => {
  // The shape at every 10 ms step over `seconds`, as runs of [shape, length].
  function runs(seconds: number, minHold: number, maxHold: number): [string, number][] {
    const out: [string, number][] = [];
    for (let i = 0; i < seconds * 100; i++) {
      const s = randomShapeAt(i / 100, minHold, maxHold);
      const last = out[out.length - 1];
      if (last && last[0] === s) last[1] += 0.01;
      else out.push([s, 0.01]);
    }
    return out;
  }

  it("is a pure function of time", () => {
    assert.equal(randomShapeAt(12.3, 0.5, 3), randomShapeAt(12.3, 0.5, 3));
  });

  it("holds each shape between minHold and maxHold, and always switches", () => {
    const r = runs(120, 0.5, 2.5);
    assert.ok(r.length > 40, `${r.length} holds`);
    // The last run is cut off by the window, so check only the complete ones.
    for (const [, len] of r.slice(0, -1)) assert.ok(len >= 0.5 - 0.011 && len <= 2.5 + 0.011, `held ${len}`);
    for (let i = 1; i < r.length; i++) assert.notEqual(r[i][0], r[i - 1][0]);
  });

  it("visits every shape", () => {
    const seen = new Set(runs(60, 0.3, 1).map(([s]) => s));
    assert.deepEqual([...seen].sort(), [...PUSH_SHAPES].sort());
  });

  it("varies the hold lengths", () => {
    const lens = runs(60, 0.5, 2.5).slice(0, -1).map(([, len]) => len.toFixed(1));
    assert.ok(new Set(lens).size > 5);
  });

  it("treats swapped bounds as the same range", () => {
    assert.deepEqual(runs(20, 2.5, 0.5), runs(20, 0.5, 2.5));
  });
});
