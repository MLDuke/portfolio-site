import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  covers,
  lightDirection,
  makeSolid,
  NO_TURN,
  pointerLightDirection,
  SHAPES,
  shadeMarched,
  shadeSolid,
  shadeSphere,
  trace,
} from "./shading.ts";
import type { Solid, Turn } from "./shading.ts";

const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);

describe("lightDirection", () => {
  it("is always a unit vector", () => {
    for (const [az, el] of [[0, 0], [70, 25], [180, -40], [310, 80]]) {
      const [x, y, z] = lightDirection(az, el);
      near(Math.hypot(x, y, z), 1);
    }
  });

  it("puts azimuth 0 at the viewer, 90 on the right, 180 behind", () => {
    const front = lightDirection(0, 0);
    const right = lightDirection(90, 0);
    const back = lightDirection(180, 0);
    near(front[2], 1);
    near(right[0], 1);
    near(back[2], -1);
  });

  it("lifts the light with elevation", () => {
    near(lightDirection(0, 90)[1], 1);
    assert.ok(lightDirection(0, -30)[1] < 0);
  });
});

describe("shadeSphere", () => {
  const front = lightDirection(0, 0);
  const right = lightDirection(90, 0);

  it("is fully lit where the normal faces the light", () => {
    const s = shadeSphere(0, 0, front, 0, 1);
    near(s.darkness, 0);
    assert.equal(s.inside, true);
  });

  it("is fully dark where the normal faces away, with no ambient", () => {
    // Light from the right: the left limb turns directly away from it.
    near(shadeSphere(-1, 0, right, 0, 1).darkness, 1);
    near(shadeSphere(1, 0, right, 0, 1).darkness, 0);
  });

  it("darkens from the lit side to the shadowed side", () => {
    // Light from the right, so the terminator is at x = 0 and the left half is all
    // ambient; the ramp is on the right half.
    const xs = [1, 0.8, 0.5, 0.2, 0];
    const d = xs.map((x) => shadeSphere(x, 0, right, 0.05, 1).darkness);
    for (let i = 1; i < d.length; i++) assert.ok(d[i] > d[i - 1], `step ${i}: ${d}`);
  });

  it("never gets darker than 1 - ambient, nor lighter than the lit centre", () => {
    const behind = lightDirection(180, 0);
    near(shadeSphere(0, 0, behind, 0.2, 1).darkness, 0.8);
    near(shadeSphere(0, 0, front, 0.2, 1).darkness, 0);
  });

  it("lifts the dark side as ambient rises", () => {
    const low = shadeSphere(-0.9, 0, right, 0, 1).darkness;
    const high = shadeSphere(-0.9, 0, right, 0.4, 1).darkness;
    assert.ok(high < low);
  });

  it("is a gamma: contrast above 1 pulls the midtones towards light, end points stay put", () => {
    const mid = (c: number) => shadeSphere(0.5, 0, right, 0, c).darkness;
    assert.ok(mid(2) < mid(1) && mid(1) < mid(0.5));
    near(shadeSphere(-1, 0, right, 0, 3).darkness, 1);
    near(shadeSphere(1, 0, right, 0, 3).darkness, 0);
  });

  it("follows the light up and down", () => {
    const above = lightDirection(0, 60);
    assert.ok(shadeSphere(0, -0.8, above, 0, 1).darkness < shadeSphere(0, 0.8, above, 0, 1).darkness);
  });

  it("flags points off the disc but keeps their darkness at the limb's", () => {
    const out = shadeSphere(2, 0, right, 0.1, 1.3);
    const limb = shadeSphere(1, 0, right, 0.1, 1.3);
    assert.equal(out.inside, false);
    near(out.darkness, limb.darkness);
    assert.equal(shadeSphere(1, 0, right, 0.1, 1.3).inside, true);
    assert.equal(shadeSphere(0.8, 0.8, right, 0.1, 1.3).inside, false);
  });

  it("stays in [0, 1]", () => {
    for (let x = -1.5; x <= 1.5; x += 0.25) {
      for (let y = -1.5; y <= 1.5; y += 0.25) {
        const { darkness } = shadeSphere(x, y, lightDirection(40, 20), 0.1, 1.5);
        assert.ok(darkness >= 0 && darkness <= 1);
      }
    }
  });
});

describe("pointerLightDirection", () => {
  it("is a unit vector pointing at the pointer, in front of the screen", () => {
    const [x, y, z] = pointerLightDirection(1.5, -0.5, 1);
    near(Math.hypot(x, y, z), 1);
    assert.ok(x > 0 && y < 0 && z > 0);
    near(x / z, 1.5);
    near(y / z, -0.5);
  });

  it("points at the viewer with the pointer at the centre", () => {
    const [x, y, z] = pointerLightDirection(0, 0, 0.7);
    near(x, 0);
    near(y, 0);
    near(z, 1);
  });

  it("rakes more as the light comes closer to the screen", () => {
    assert.ok(pointerLightDirection(1, 0, 0.3)[0] > pointerLightDirection(1, 0, 3)[0]);
  });

  it("survives a degenerate input", () => {
    assert.deepEqual(pointerLightDirection(0, 0, 0), [0, 0, 0]);
  });
});

// Where a point on a solid's local axis lands on screen, in unit-disc
// coordinates (y down), found by turning it into the world.
function worldOf(solid: Solid, local: [number, number, number]): [number, number, number] {
  const m = solid.frame; // world to local, so its transpose is local to world
  return [0, 1, 2].map((j) => m[0][j] * local[0] + m[1][j] * local[1] + m[2][j] * local[2]) as [number, number, number];
}
function screenOf(solid: Solid, local: [number, number, number]): [number, number] {
  const w = worldOf(solid, local);
  return [w[0], -w[1]];
}

// The distinct flat tones over a solid: darkness bucketed to a hundredth, kept
// when it covers at least 5% of the shape.
function tones(solid: Solid, light: ReturnType<typeof lightDirection>): number[] {
  const counts = new Map<number, number>();
  let total = 0;
  for (let x = -1; x <= 1; x += 0.02) {
    for (let y = -1; y <= 1; y += 0.02) {
      const s = shadeSolid(solid, x, y, light, 0.05, 1);
      if (!s.inside) continue;
      total++;
      const k = Math.round(s.darkness * 100);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  return [...counts.entries()].filter(([, n]) => n > total * 0.05).map(([k]) => k / 100);
}

// What a solid's silhouette covers, by a fine grid: how far out, across and up
// it reaches, and what fraction of the unit disc's area it fills.
function silhouette(solid: Solid, step = 0.01) {
  let reach = 0;
  let across = 0;
  let up = 0;
  let inside = 0;
  for (let x = -1.6; x <= 1.6; x += step) {
    for (let y = -1.6; y <= 1.6; y += step) {
      if (!covers(solid, x, y)) continue;
      inside++;
      reach = Math.max(reach, Math.hypot(x, y));
      across = Math.max(across, Math.abs(x));
      up = Math.max(up, Math.abs(y));
    }
  }
  return { reach, across, up, fill: (inside * step * step) / Math.PI };
}

describe("solids", () => {
  it("fit the unit circle, and the round ones fill it", () => {
    for (const kind of SHAPES) {
      const { reach } = silhouette(makeSolid(kind));
      assert.ok(reach <= 1.005, `${kind} reaches ${reach}`);
    }
    for (const kind of ["sphere", "donut"] as const) {
      assert.ok(silhouette(makeSolid(kind)).reach > 0.97, kind);
    }
  });

  it("are inside at the middle, outside beyond the circle, and never inside there", () => {
    for (const kind of SHAPES.filter((k) => k !== "donut")) {
      const solid = makeSolid(kind);
      assert.equal(covers(solid, 0, 0), true, kind);
      assert.equal(shadeSolid(solid, 0, 0, lightDirection(0, 0), 0, 1).inside, true, kind);
    }
    for (const kind of SHAPES) {
      const solid = makeSolid(kind);
      assert.equal(covers(solid, 1.2, 0), false, kind);
      assert.equal(shadeSolid(solid, 0, 1.4, lightDirection(0, 0), 0, 1).inside, false, kind);
    }
  });

  it("keep the sphere's closed form and the ray-cast marcher in agreement", () => {
    const sphere = makeSolid("sphere");
    for (const [az, el] of [[0, 0], [60, 20], [200, -35]]) {
      const light = lightDirection(az, el);
      for (let x = -1.2; x <= 1.2; x += 0.1) {
        for (let y = -1.2; y <= 1.2; y += 0.1) {
          const exact = shadeSphere(x, y, light, 0.05, 1.2);
          const marched = shadeMarched(sphere, x, y, light, 0.05, 1.2);
          // A ray that grazes the limb stops a hair early, which tilts its normal
          // a few percent towards the viewer, so the rim gets more slack.
          const slack = Math.hypot(x, y) < 0.9 ? 0.01 : 0.08;
          assert.ok(Math.abs(exact.darkness - marched.darkness) < slack, `(${x}, ${y}): ${exact.darkness} vs ${marched.darkness}`);
          // Within a hair of the limb the two may disagree about which side.
          if (Math.abs(Math.hypot(x, y) - 1) > 0.01) assert.equal(marched.inside, exact.inside, `(${x}, ${y})`);
        }
      }
    }
  });

  it("lands a ray on the near surface, not the far one", () => {
    const cube = makeSolid("cube");
    const { hit, p } = trace(cube, 0, 0);
    assert.equal(hit, true);
    // In the world the hit is at z > 0: it faces the viewer.
    const m = cube.frame;
    const wz = m[0][2] * p[0] + m[1][2] * p[1] + m[2][2] * p[2];
    assert.ok(wz > 0, `z = ${wz}`);
  });

  it("stay in [0, 1] and are deterministic", () => {
    for (const kind of SHAPES) {
      const solid = makeSolid(kind);
      for (let x = -1.3; x <= 1.3; x += 0.13) {
        for (let y = -1.3; y <= 1.3; y += 0.13) {
          const a = shadeSolid(solid, x, y, lightDirection(40, 20), 0.1, 1.5);
          assert.ok(a.darkness >= 0 && a.darkness <= 1, `${kind} (${x}, ${y})`);
          assert.deepEqual(a, shadeSolid(solid, x, y, lightDirection(40, 20), 0.1, 1.5));
        }
      }
    }
  });
});

describe("cube", () => {
  const cube = makeSolid("cube");
  // The three faces that show, by the local axes they face.
  const h = 1 / Math.sqrt(3); // half the edge
  const top = screenOf(cube, [0, h, 0]);
  const left = screenOf(cube, [-h, 0, 0]);
  const right = screenOf(cube, [0, 0, h]);
  const at = (p: [number, number], light: ReturnType<typeof lightDirection>) =>
    shadeSolid(cube, p[0], p[1], light, 0, 1).darkness;

  it("shows the top and two sides, in the right places", () => {
    assert.ok(top[1] < left[1] && top[1] < right[1], "the top face is higher on screen");
    assert.ok(left[0] < 0 && right[0] > 0, "the sides sit left and right");
    for (const p of [top, left, right]) assert.equal(covers(cube, p[0], p[1]), true);
  });

  it("is flat shaded: a face has one tone", () => {
    const light = lightDirection(30, 30);
    for (const p of [top, left, right]) {
      near(at(p, light), at([p[0] * 0.8, p[1] * 0.8], light), 0.01);
    }
  });

  it("lights the face that turns towards the light", () => {
    // From the right the right-hand face is lit and the left one is not.
    const fromRight = lightDirection(90, 0);
    assert.ok(at(right, fromRight) < at(left, fromRight));
    const fromLeft = lightDirection(-90, 0);
    assert.ok(at(left, fromLeft) < at(right, fromLeft));
    // From above the top is brightest.
    const fromAbove = lightDirection(0, 85);
    assert.ok(at(top, fromAbove) < at(left, fromAbove));
    assert.ok(at(top, fromAbove) < at(right, fromAbove));
  });

  it("reads as three tones under a light from the upper right", () => {
    assert.equal(tones(cube, lightDirection(40, 35)).length, 3);
  });
});

describe("triangle", () => {
  const tri = makeSolid("triangle");

  it("is a triangle: it fills well under the disc it sits in", () => {
    const { fill } = silhouette(tri);
    assert.ok(fill > 0.3 && fill < 0.65, `${fill}`);
  });

  it("shows at least two faces with different tones", () => {
    assert.ok(tones(tri, lightDirection(40, 35)).length >= 2);
  });
});

describe("donut", () => {
  const donut = makeSolid("donut", 0.38);

  it("has an open hole", () => {
    assert.equal(covers(donut, 0, 0), false);
    assert.equal(shadeSolid(donut, 0, 0, lightDirection(0, 0), 0, 1).inside, false);
    // The ring itself, out along the axis the tilt leaves alone.
    const major = 1 / 1.38;
    assert.equal(covers(donut, major, 0), true);
    assert.equal(covers(donut, -major, 0), true);
    assert.equal(covers(donut, 0.99, 0), true);
  });

  it("fattens with thickness, and closes the hole when it gets very thick", () => {
    const thin = silhouette(makeSolid("donut", 0.15)).fill;
    const fat = silhouette(makeSolid("donut", 0.5)).fill;
    assert.ok(fat > thin, `${thin} ${fat}`);
    assert.equal(covers(makeSolid("donut", 0.9), 0, 0), true);
  });

  it("still shades a point in the hole, for a word whose centre lands there", () => {
    const s = shadeSolid(donut, 0, 0, lightDirection(40, 20), 0.04, 1);
    assert.ok(Number.isFinite(s.darkness) && s.darkness >= 0 && s.darkness <= 1);
  });

  it("is lit on the side facing the light", () => {
    // Light from the right: the tube's outer right edge is lighter than its
    // outer left edge.
    const light = lightDirection(90, 0);
    const right = shadeSolid(donut, 0.9, 0, light, 0, 1).darkness;
    const left = shadeSolid(donut, -0.9, 0, light, 0, 1).darkness;
    assert.ok(right < left, `${right} ${left}`);
  });
});

describe("turning", () => {
  const close = (got: readonly number[], want: readonly number[], eps = 1e-4) =>
    want.forEach((v, i) => assert.ok(Math.abs(got[i] - v) < eps, `${got} !~ ${want}`));
  const sin = (d: number) => Math.sin((d * Math.PI) / 180);
  const cos = (d: number) => Math.cos((d * Math.PI) / 180);

  it("starts each solid at its own tilt", () => {
    // The cube's +z face normal after 45 degrees about y, then 35 about x.
    close(worldOf(makeSolid("cube"), [0, 0, 1]), [sin(45), -cos(45) * sin(35), cos(45) * cos(35)]);
    // The tetrahedron's apex, after -10 about y then -12 about x.
    close(worldOf(makeSolid("triangle"), [0, 0, 1]), [sin(-10), cos(-10) * sin(12), cos(-10) * cos(12)]);
    // The donut's axis, tipped 60 degrees from vertical towards the viewer.
    close(worldOf(makeSolid("donut"), [0, 1, 0]), [0, cos(60), sin(60)]);
  });

  it("turns a face normal about the screen's axes, x then y then z", () => {
    const donut = (turn: Partial<Turn>) => worldOf(makeSolid("donut", 0.38, { ...NO_TURN, ...turn }), [0, 1, 0]);
    close(donut({ z: 90 }), [-cos(60), 0, sin(60)]); // roll
    close(donut({ x: 90 }), [0, -sin(60), cos(60)]); // tip
    close(donut({ y: 90 }), [sin(60), cos(60), 0]); // swing round the vertical
    // Tip then swing: (0, -sin60, cos60) swung 90 about y.
    close(donut({ x: 90, y: 90 }), [cos(60), -sin(60), 0]);
    const cube = (turn: Partial<Turn>) => worldOf(makeSolid("cube", 0.38, { ...NO_TURN, ...turn }), [0, 0, 1]);
    // The +z face normal, (0.707, -0.406, 0.579) at rest, swung 90 about y.
    close(cube({ y: 90 }), [cos(45) * cos(35), -cos(45) * sin(35), -sin(45)]);
  });

  it("is the default with no turn, or a whole one", () => {
    const light = lightDirection(50, 25);
    for (const kind of ["cube", "triangle", "donut"] as const) {
      const rest = makeSolid(kind);
      const whole = makeSolid(kind, 0.38, { x: 360, y: -360, z: 720 });
      assert.deepEqual(makeSolid(kind, 0.38, NO_TURN).frame, rest.frame);
      for (let x = -1; x <= 1; x += 0.2) {
        for (let y = -1; y <= 1; y += 0.2) {
          const a = shadeSolid(rest, x, y, light, 0.05, 1);
          const b = shadeSolid(whole, x, y, light, 0.05, 1);
          assert.equal(a.inside, b.inside, `${kind} (${x}, ${y})`);
          near(a.darkness, b.darkness, 1e-6);
        }
      }
    }
  });

  it("leaves the sphere alone", () => {
    assert.deepEqual(makeSolid("sphere", 0.38, { x: 40, y: 70, z: 10 }).frame, makeSolid("sphere").frame);
  });

  it("changes what shows, so the silhouette really moves", () => {
    const rest = silhouette(makeSolid("cube"), 0.02);
    const turned = silhouette(makeSolid("cube", 0.38, { x: 0, y: 40, z: 0 }), 0.02);
    assert.ok(Math.abs(rest.across - turned.across) > 0.02 || Math.abs(rest.up - turned.up) > 0.02);
  });

  it("keeps every solid inside the unit circle however it is turned", () => {
    // A seeded spread of turns, so a failure reproduces.
    let seed = 7;
    const next = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296) * 360 - 180;
    for (const kind of ["cube", "triangle", "donut"] as const) {
      for (let i = 0; i < 12; i++) {
        const turn = { x: next(), y: next(), z: next() };
        const { reach } = silhouette(makeSolid(kind, 0.38, turn), 0.02);
        assert.ok(reach <= 1.01, `${kind} ${JSON.stringify(turn)} reaches ${reach}`);
      }
    }
    // And a thick or thin donut, which changes its tube but not its reach.
    for (const t of [0.1, 0.8]) assert.ok(silhouette(makeSolid("donut", t, { x: 30, y: 50, z: 20 }), 0.02).reach <= 1.01);
  });

  it("reaches the unit circle at some turn, so the fit is tight", () => {
    // A corner of the cube (or a vertex of the tetrahedron) held in the screen plane.
    for (const kind of ["cube", "triangle"] as const) {
      let best = 0;
      for (let x = -90; x <= 90; x += 30) {
        for (let y = -90; y <= 90; y += 30) best = Math.max(best, silhouette(makeSolid(kind, 0.38, { x, y, z: 0 }), 0.02).reach);
      }
      assert.ok(best > 0.97, `${kind} only reaches ${best}`);
    }
  });
});
