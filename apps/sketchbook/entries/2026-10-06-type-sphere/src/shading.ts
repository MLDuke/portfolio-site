// Analytic Lambert shading for a sphere: pure maths, no canvas and no DOM, so
// it can be tested under node:test. The sketch asks it one question, "how dark
// is the sphere at this point?", and sizes a word by the answer.
//
// Coordinates are the unit disc: (0, 0) is the sphere's centre, the limb is at
// radius 1, x runs right and y runs DOWN the screen, like the canvas.

export type Vec3 = readonly [x: number, y: number, z: number];

export interface Shade {
  darkness: number; // 0 = fully lit, 1 = fully in shadow
  inside: boolean; // false when the point is off the disc
}

// A unit vector pointing at the light. +x is screen right, +y is up, +z is out
// of the screen towards the viewer. Azimuth is the angle round the vertical
// axis: 0 puts the light behind the viewer, 90 on the right, 180 behind the
// sphere. Elevation lifts it above (positive) or below (negative) the equator.
export function lightDirection(azimuthDeg: number, elevationDeg: number): Vec3 {
  const az = (azimuthDeg * Math.PI) / 180;
  const el = (elevationDeg * Math.PI) / 180;
  return [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)];
}

// A unit vector pointing at a light that sits over the point (x, y) in the
// screen plane, `height` in front of it. x and y are in radius units from the
// shape's centre with y UP, like the light itself; height is in the same units,
// so a small one rakes the light across the surface and a large one lights it
// from nearly head on, however far out the pointer is.
export function pointerLightDirection(x: number, y: number, height: number): Vec3 {
  const len = Math.hypot(x, y, height) || 1;
  return [x / len, y / len, height / len];
}

// Darkness of the sphere at (x, y) on the unit disc.
//
//   normal   = (x, -y, sqrt(1 - x^2 - y^2))      the surface normal there
//   lambert  = max(0, normal . light)
//   lit      = ambient + (1 - ambient) * lambert   ambient is the floor of light
//   darkness = (1 - lit) ^ contrast                contrast bends the ramp
//
// Contrast is a gamma on the darkness: above 1 it pulls the midtones towards
// the light, so the shadow shrinks to a tighter, harder crescent; below 1 it
// pushes them towards the dark, so more of the sphere swells. A point off the disc
// is reported as outside, but its darkness is still that of the nearest limb
// point, so a caller that samples a word's centre just past the edge gets a
// sensible number instead of a hole.
export function shadeSphere(
  x: number,
  y: number,
  light: Vec3,
  ambient: number,
  contrast: number,
): Shade {
  const r2 = x * x + y * y;
  const inside = r2 <= 1;
  const k = inside ? 1 : 1 / Math.sqrt(r2);
  const nx = x * k;
  const ny = y * k;
  const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
  const lambert = Math.max(0, nx * light[0] - ny * light[1] + nz * light[2]);
  const lit = ambient + (1 - ambient) * lambert;
  const darkness = Math.pow(Math.min(1, Math.max(0, 1 - lit)), contrast);
  return { darkness, inside };
}

// ---------------------------------------------------------------------------
// Other solids
//
// The sphere has a closed form, so it keeps it. A cube, a tetrahedron and a
// torus don't, so they are signed distance fields (SDFs) and each sample is a
// ray cast: an orthographic ray starting in front of the screen at (x, y) and
// running straight back along -z, advanced by the distance to the nearest
// surface until it touches one (sphere tracing). The normal is the SDF's
// gradient there; Lambert, ambient and contrast are exactly as above.
//
// Every solid is scaled so the sphere that holds it has radius 1, which is what
// the radius dial sizes. That makes the fit independent of how the solid is
// turned: however it is rotated, or spun, its silhouette stays inside the unit
// circle, and so inside the canvas, and never changes size. Each starts turned
// a little so it shows more than one face; the rotation dials turn it further.
// Turning is done by moving the ray and the light into the solid's own frame,
// so the SDFs stay axis-aligned and simple.

export type ShapeKind = "sphere" | "cube" | "triangle" | "donut";
export const SHAPES: readonly ShapeKind[] = ["sphere", "cube", "triangle", "donut"];

type Mat3 = readonly [
  readonly [number, number, number],
  readonly [number, number, number],
  readonly [number, number, number],
];

export interface Solid {
  kind: ShapeKind;
  // World to local: local = frame * world.
  frame: Mat3;
  // Distance to the surface (a lower bound is enough) at a local point.
  sdf: (x: number, y: number, z: number) => number;
}

const rad = (deg: number) => (deg * Math.PI) / 180;

function rotX(deg: number): Mat3 {
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  return [[1, 0, 0], [0, c, -s], [0, s, c]];
}
function rotY(deg: number): Mat3 {
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  return [[c, 0, s], [0, 1, 0], [-s, 0, c]];
}
function rotZ(deg: number): Mat3 {
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
}
function mul(a: Mat3, b: Mat3): Mat3 {
  const out = [0, 1, 2].map((i) => [0, 1, 2].map((j) => a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j]));
  return out as unknown as Mat3;
}
function transpose(m: Mat3): Mat3 {
  return [[m[0][0], m[1][0], m[2][0]], [m[0][1], m[1][1], m[2][1]], [m[0][2], m[1][2], m[2][2]]];
}

// Each solid's own tilt is world = base * local. A cube at 35 degrees about x
// and 45 about y shows its top and two sides.
const CUBE_TURN = mul(rotX(35), rotY(45));
// A tetrahedron with a vertex towards the viewer reads as a triangle with
// three faces meeting at the middle. Tipped a little so those faces differ.
const TETRA_TURN = mul(rotX(-12), rotY(-10));
// A torus with its axis (local y) tipped 60 degrees from the screen plane, so
// the hole is open and the near side of the ring is on top.
const DONUT_TURN = rotX(60);

// Regular tetrahedron of circumradius 1 with a vertex on +z. Each face is
// opposite a vertex, so its outward normal is minus that vertex's direction,
// and its distance from the centre is the inradius, 1/3.
const BASE_R = Math.sqrt(8) / 3;
const TETRA_VERTS: Vec3[] = [
  [0, 0, 1],
  ...[90, 210, 330].map((a): Vec3 => [BASE_R * Math.cos(rad(a)), BASE_R * Math.sin(rad(a)), -1 / 3]),
];
const TETRA_NORMALS = TETRA_VERTS.map(([x, y, z]): Vec3 => [-x, -y, -z]);
const TETRA_INRADIUS = 1 / 3;
const IDENTITY: Mat3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

// A turn on top of a solid's own tilt, in degrees about the screen's axes: x
// tips its top towards you, y swings it round the vertical, z rolls it. They are
// applied in that order, so y spins the solid about the screen's vertical
// whatever x has done to it.
export interface Turn {
  x: number;
  y: number;
  z: number;
}
export const NO_TURN: Turn = { x: 0, y: 0, z: 0 };

// `thickness` is the donut's tube radius as a fraction of its major radius.
// The sphere ignores the turn, being the same from every side.
export function makeSolid(kind: ShapeKind, thickness = 0.38, turn: Turn = NO_TURN): Solid {
  if (kind === "sphere") {
    return { kind, frame: IDENTITY, sdf: (x, y, z) => Math.hypot(x, y, z) - 1 };
  }
  const base = kind === "cube" ? CUBE_TURN : kind === "triangle" ? TETRA_TURN : DONUT_TURN;
  const frame = transpose(mul(mul(rotZ(turn.z), mul(rotY(turn.y), rotX(turn.x))), base));
  if (kind === "cube") {
    const h = 1 / Math.sqrt(3); // half the edge: the corners are at radius 1
    return {
      kind,
      frame,
      sdf: (x, y, z) => {
        const qx = Math.abs(x) - h;
        const qy = Math.abs(y) - h;
        const qz = Math.abs(z) - h;
        return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0);
      },
    };
  }
  if (kind === "triangle") {
    return {
      kind,
      frame,
      // The largest signed distance to any face plane: exact inside, and a
      // lower bound outside, which sphere tracing tolerates.
      sdf: (x, y, z) => {
        let d = -Infinity;
        for (const n of TETRA_NORMALS) d = Math.max(d, x * n[0] + y * n[1] + z * n[2] - TETRA_INRADIUS);
        return d;
      },
    };
  }
  const tube = Math.min(0.9, Math.max(0.05, thickness));
  const major = 1 / (1 + tube); // major + minor = 1
  const minor = major * tube;
  return { kind, frame, sdf: (x, y, z) => Math.hypot(Math.hypot(x, z) - major, y) - minor };
}

// Rays that end within HIT of a surface count as touching it. MAX_STEPS bounds
// the work on a ray that grazes a silhouette without ever quite landing.
const HIT = 0.0015;
const MAX_STEPS = 48;
const NORMAL_H = 0.001;

interface Trace {
  hit: boolean;
  // Local point where the ray landed, or on a miss, where it came closest.
  p: Vec3;
}

// Cast one ray at (x, y), in radius units (y down), through a solid.
export function trace(solid: Solid, x: number, y: number): Trace {
  const { frame: m, sdf } = solid;
  const wy = -y; // screen y runs down, world y runs up
  // Start one radius in front of the screen plane, outside the solid.
  const ox = m[0][0] * x + m[0][1] * wy + m[0][2];
  const oy = m[1][0] * x + m[1][1] * wy + m[1][2];
  const oz = m[2][0] * x + m[2][1] * wy + m[2][2];
  const dx = -m[0][2];
  const dy = -m[1][2];
  const dz = -m[2][2];
  // The ray crosses the unit sphere that holds every solid between these two
  // distances from where it starts, so march only that stretch.
  const half = Math.sqrt(Math.max(0, 1 - x * x - y * y));
  const tMax = 1 + half;
  let t = 1 - half;
  let nearest = Infinity;
  let nearT = 0;
  for (let i = 0; i < MAX_STEPS; i++) {
    const d = sdf(ox + dx * t, oy + dy * t, oz + dz * t);
    if (d < HIT) return { hit: true, p: [ox + dx * t, oy + dy * t, oz + dz * t] };
    if (d < nearest) {
      nearest = d;
      nearT = t;
    }
    t += d;
    if (t > tMax) break;
  }
  return { hit: false, p: [ox + dx * nearT, oy + dy * nearT, oz + dz * nearT] };
}

// The SDF's gradient at a point, from four samples at the corners of a
// tetrahedron, normalised.
function gradient(sdf: Solid["sdf"], p: Vec3): Vec3 {
  const h = NORMAL_H;
  const a = sdf(p[0] + h, p[1] - h, p[2] - h);
  const b = sdf(p[0] - h, p[1] - h, p[2] + h);
  const c = sdf(p[0] - h, p[1] + h, p[2] - h);
  const d = sdf(p[0] + h, p[1] + h, p[2] + h);
  const nx = a - b - c + d;
  const ny = -a - b + c + d;
  const nz = -a + b - c + d;
  const len = Math.hypot(nx, ny, nz) || 1;
  return [nx / len, ny / len, nz / len];
}

// Darkness of a solid at (x, y) in radius units, same ramp as shadeSphere. The
// sphere takes its closed form, which is exact and far cheaper than a march;
// everything else goes through shadeMarched.
export function shadeSolid(
  solid: Solid,
  x: number,
  y: number,
  light: Vec3,
  ambient: number,
  contrast: number,
): Shade {
  if (solid.kind === "sphere") return shadeSphere(x, y, light, ambient, contrast);
  return shadeMarched(solid, x, y, light, ambient, contrast);
}

// The ray-cast version of shadeSolid, for any solid; a test holds it to
// shadeSphere on the sphere.
//
// `inside` is whether the ray lands on the solid, so a donut's hole is outside.
// A point outside is still shaded, by the normal where its ray passed closest,
// which for a sphere is the limb's, so a word whose centre hangs past an edge
// gets a sensible number rather than a hole. Beyond the unit circle nothing can
// be hit, so the ray is cast from the nearest point on the circle instead.
export function shadeMarched(
  solid: Solid,
  x: number,
  y: number,
  light: Vec3,
  ambient: number,
  contrast: number,
): Shade {
  const r = Math.hypot(x, y);
  const beyond = r > 1;
  const k = beyond ? 1 / r : 1;
  const { hit, p } = trace(solid, x * k, y * k);
  const n = gradient(solid.sdf, p);
  const m = solid.frame;
  // The light in the solid's frame; Lambert only needs the two to agree.
  const lx = m[0][0] * light[0] + m[0][1] * light[1] + m[0][2] * light[2];
  const ly = m[1][0] * light[0] + m[1][1] * light[1] + m[1][2] * light[2];
  const lz = m[2][0] * light[0] + m[2][1] * light[1] + m[2][2] * light[2];
  const lambert = Math.max(0, n[0] * lx + n[1] * ly + n[2] * lz);
  const lit = ambient + (1 - ambient) * lambert;
  const darkness = Math.pow(Math.min(1, Math.max(0, 1 - lit)), contrast);
  return { darkness, inside: hit && !beyond };
}

// Whether the ray at (x, y) lands on the solid: the silhouette, without the
// cost of a normal.
export function covers(solid: Solid, x: number, y: number): boolean {
  if (x * x + y * y > 1) return false;
  if (solid.kind === "sphere") return true;
  return trace(solid, x, y).hit;
}
