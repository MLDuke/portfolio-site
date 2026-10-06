import { layoutPanels, MAX_PANELS } from "./layout.ts";
import { PUSH_CELL } from "./push.ts";
import type { PushField, StripField } from "./push.ts";

// The WebGL2 side of the dot raster: GLSL, compile and link, context loss,
// drawing-buffer sizing, the image texture and uniform packing. The sketch sees
// only createDotRenderer(); nothing here touches React.
//
// The whole pipeline lives in one fragment shader over a full-screen triangle:
// each pixel finds its panel, then its dot cell, evaluates the field at that
// cell's centre and draws an antialiased circle. Cost depends on pixel count,
// not dot count. JS only lays out the panels (layout.ts) and uploads uniforms.

// Order is the shader's `uSource` int; the sketch's source select reads the
// same list, so the two can't disagree.
export const SOURCES = ["band", "ripple", "interference", "image"] as const;

// Ambient motion for the image source, shared with its select the same way.
export const IMAGE_MOTIONS = ["still", "wave", "flow"] as const;

const MAX_INTERFERENCE = 4; // interference sources the shader loops over

// What one frame needs, in CSS pixels. The sketch's dial values fit this shape.
export interface DotParams {
  width: number;
  height: number;
  source: string;
  render: string; // "binary" | "halftone"
  threshold: number;
  inactiveColor: string;
  activeColor: string;
  inactiveRadius: number;
  activeRadius: number;
  grid: { spacing: number };
  panels: { multiPanel: boolean; cols: number; rows: number; gap: number; lag: number };
  band: { wavelength: number; amplitude: number; thickness: number; angle: number; speed: number; pitch: number };
  ripple: { wavelength: number; speed: number; falloff: number; centerX: number; centerY: number };
  interference: { count: number; wavelength: number; speed: number; seed: number };
  image: {
    invert: boolean;
    contrast: number;
    brightness: number;
    motion: string; // one of IMAGE_MOTIONS
    amount: number;
    scale: number;
    speed: number;
  };
}

export interface DotRenderer {
  // Draw one frame; `time` is seconds of un-paused time. The push fields
  // displace the image source; each is re-uploaded only when its version
  // changes.
  render(params: DotParams, time: number, push: PushFields): void;
  // Hand over a decoded image. The renderer owns it from here: it uploads it
  // on the next render, re-uploads it after a context restore, and closes it
  // when replaced or destroyed.
  setImage(bitmap: ImageBitmap): void;
  destroy(): void;
}

// Every push field at once: whichever shape is pushing now, the others may
// still be springing home.
export interface PushFields {
  brush: PushField | null;
  rows: StripField | null;
  columns: StripField | null;
}

export interface DotRendererHooks {
  // Something stopped the dots drawing; the message is ready to show.
  onError(message: string): void;
  // The context came back and is rebuilt; draw again.
  onRestore(): void;
}

// --- shaders ---------------------------------------------------------------
// Coordinates are CSS pixels from the grid's top-left; a pixel's field
// position is its dot centre's offset from the panel centre, divided by the
// panel's scale, so px-valued dials keep their meaning in every panel. `t` is
// seconds of un-paused time, already offset per panel. Array sizes and source
// ids are interpolated from the constants above, so JS and GLSL share them.

const VERT = `#version 300 es
void main() {
  // One oversized triangle covers the viewport; no buffers needed.
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
precision highp int;

const float TAU = 6.28318530718;
const int MAX_PANELS = ${MAX_PANELS};
const int MAX_INTERFERENCE = ${MAX_INTERFERENCE};
${SOURCES.map((name, i) => `const int SRC_${name.toUpperCase()} = ${i};`).join("\n")}
${IMAGE_MOTIONS.map((name, i) => `const int MOTION_${name.toUpperCase()} = ${i};`).join("\n")}

uniform float uDpr;         // drawing-buffer px per CSS px
uniform float uBufH;        // drawing-buffer height, to flip gl_FragCoord
uniform vec2 uSize;         // full grid size, CSS px
uniform float uPitch;
uniform float uRIn;
uniform float uRAct;
uniform float uThreshold;
uniform int uBinary;
uniform vec3 uCIn;
uniform vec3 uCAct;
uniform int uSource;        // SRC_*

uniform int uPanelCount;
uniform vec4 uRect[MAX_PANELS];  // x, y, w, h in CSS px
uniform vec4 uGrid[MAX_PANELS];  // first cell's x, y in CSS px, then cols, rows
uniform vec2 uTS[MAX_PANELS];    // time offset, scale

uniform vec4 uBand;         // wavelength, amplitude, thickness, pitch
uniform vec2 uBandMotion;   // angle (rad), speed
uniform vec3 uRipple;       // wavelength, speed, falloff
uniform vec2 uRippleC;      // centre as a fraction of the grid
uniform int uIntCount;
uniform vec2 uIntSrc[MAX_INTERFERENCE]; // seeded source positions, px from grid centre
uniform vec2 uInt;          // wavelength, speed

uniform sampler2D uImage;
uniform int uHasImage;
uniform vec2 uImageSize;
uniform vec3 uImageAdj;     // contrast, brightness, invert
uniform int uImageMotion;   // MOTION_*
uniform vec3 uMotion;       // amount (px), scale (px), speed (cycles/s)
uniform sampler2D uPush;    // pointer displacement in px, one texel per PUSH_CELL
uniform vec2 uPushSpan;     // px the push texture covers, from the grid's top-left
uniform sampler2D uRows;    // one slide per row strip in px, in a single-row texture
uniform sampler2D uCols;    // the same for column strips
uniform int uStrips;        // bit 1: rows are set, bit 2: columns are
uniform vec2 uStripSize;    // px per row strip, px per column strip

out vec4 outColor;

float bandField(vec2 p, float t) {
  float a = uBandMotion.x;
  float along = p.x * cos(a) + p.y * sin(a);
  float across = -p.x * sin(a) + p.y * cos(a);
  float phase = along / uBand.x - t * uBandMotion.y;
  // The wave travels along the band; the whole pattern also drifts across it,
  // so the stripes sweep rather than only wobble.
  float centre = uBand.y * sin(phase * TAU);
  float drift = t * uBandMotion.y * uBand.w * 0.5;
  float dist = abs(mod(across - centre - drift, uBand.w) - uBand.w * 0.5);
  // Swell the band along its length so it tapers like a brush stroke.
  float half_ = uBand.z * 0.5 * (0.82 + 0.18 * sin(along / uBand.x * 2.1 + 1.0));
  return 1.0 - smoothstep(half_ * 0.35, half_, dist);
}

float rippleField(vec2 p, float t) {
  float r = length(p - (uRippleC - 0.5) * uSize);
  float ring = 0.5 + 0.5 * cos((r / uRipple.x - t * uRipple.y) * TAU);
  float fade = exp(-uRipple.z * r / (length(uSize) * 0.5));
  // Smoothstepped ring: thins the rings into bold arcs, not a soft wash.
  return fade * ring * ring * (3.0 - 2.0 * ring);
}

float interferenceField(vec2 p, float t) {
  float sum = 0.0;
  for (int i = 0; i < MAX_INTERFERENCE; i++) {
    if (i >= uIntCount) break;
    sum += cos((length(p - uIntSrc[i]) / uInt.x - t * uInt.y) * TAU);
  }
  float norm = sum / float(uIntCount);
  return clamp(0.5 + 0.5 * clamp(norm * 1.5, -1.0, 1.0), 0.0, 1.0);
}

// The picture is cover-fit into the full composition and sampled at field
// position q, so it shares the other sources' coordinates and can be displaced
// like them. The mip level comes from one dot's footprint in image pixels
// (pitch / s composition px), so a coarse grid averages instead of aliasing.
// textureLod, not texture: q is constant per cell, so screen derivatives would
// be wrong.
float imageField(vec2 q, float s) {
  if (uHasImage == 0) return 0.0;
  float fit = max(uSize.x / uImageSize.x, uSize.y / uImageSize.y); // px per image px
  vec2 uv = 0.5 + q / (fit * uImageSize);
  vec3 c = textureLod(uImage, uv, log2(max(1.0, uPitch / (s * fit)))).rgb;
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float v = clamp((lum - 0.5) * uImageAdj.x + 0.5 + uImageAdj.y, 0.0, 1.0);
  return uImageAdj.z > 0.5 ? 1.0 - v : v;
}

// How far the image has moved at p by time t, in px. Analytic in t like the
// sources, so a lagging panel just asks for an earlier t.
vec2 imageMotion(vec2 p, float t) {
  if (uImageMotion == MOTION_STILL) return vec2(0.0);
  vec2 q = p / uMotion.y * TAU;
  float ph = t * uMotion.z * TAU;
  // wave: each row slides sideways, like heat shimmer.
  if (uImageMotion == MOTION_WAVE) return vec2(uMotion.x * sin(q.y - ph), 0.0);
  // flow: incommensurate sines per axis, so it churns without visibly repeating.
  vec2 d = vec2(
    sin(q.y * 0.83 + ph) + 0.6 * sin(q.x * 0.37 + q.y * 0.61 - ph * 1.31),
    sin(q.x * 0.71 - ph * 0.87) + 0.6 * sin(q.y * 0.47 - q.x * 0.53 + ph * 1.13));
  return uMotion.x * d / 1.6;
}

// The pointer's push at p. Every panel shows the live push: it is state, not a
// function of t, so there's no earlier copy for a lagging panel to show.
vec2 pushAt(vec2 p) {
  return texture(uPush, (p + 0.5 * uSize) / uPushSpan).rg;
}

// The slide of the strip at pos (px across the strips). The whole strip
// moves as one, so it's fetched by index, unfiltered, keeping edges hard.
float stripSlide(sampler2D strips, float pos, float size) {
  int n = textureSize(strips, 0).x;
  return texelFetch(strips, ivec2(clamp(int(floor(pos / size)), 0, n - 1), 0), 0).r;
}

// The strip push at p: rows slide sideways, columns up and down.
vec2 stripAt(vec2 p) {
  vec2 q = p + 0.5 * uSize;
  vec2 d = vec2(0.0);
  if ((uStrips & 1) != 0) d.x = stripSlide(uRows, q.y, uStripSize.x);
  if ((uStrips & 2) != 0) d.y = stripSlide(uCols, q.x, uStripSize.y);
  return d;
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uBufH - gl_FragCoord.y) / uDpr;

  int hit = -1;
  for (int i = 0; i < MAX_PANELS; i++) {
    if (i >= uPanelCount) break;
    vec4 r = uRect[i];
    if (px.x >= r.x && px.x < r.x + r.z && px.y >= r.y && px.y < r.y + r.w) {
      hit = i;
      break;
    }
  }
  if (hit < 0) { // a gap between panels, or outside the grid
    outColor = vec4(0.0);
    return;
  }

  vec4 rc = uRect[hit];
  float t = uTS[hit].x;
  float s = uTS[hit].y;
  // Cell counts and origin come from layout.ts; this is just the per-pixel step.
  vec4 gr = uGrid[hit];
  vec2 dim = gr.zw;
  vec2 cell = clamp(floor((px - gr.xy) / uPitch), vec2(0.0), dim - 1.0);
  vec2 centre = gr.xy + (cell + 0.5) * uPitch;
  vec2 f = (centre - (rc.xy + rc.zw * 0.5)) / s;

  float v;
  if (uSource == SRC_RIPPLE) v = rippleField(f, t);
  else if (uSource == SRC_INTERFERENCE) v = interferenceField(f, t);
  else if (uSource == SRC_IMAGE) v = imageField(f - imageMotion(f, t) - pushAt(f) - stripAt(f), s);
  else v = bandField(f, t);
  v = clamp(v, 0.0, 1.0);

  bool on = v >= uThreshold;
  float rad = uBinary == 1 ? (on ? uRAct : uRIn) : mix(uRIn, uRAct, v);
  vec3 col = uBinary == 1 ? (on ? uCAct : uCIn) : mix(uCIn, uCAct, v);

  // About one device pixel of antialiasing. Output is premultiplied so the
  // stage shows through everywhere that isn't a dot.
  float a = 1.0 - smoothstep(rad - 0.5 / uDpr, rad + 0.5 / uDpr, length(px - centre));
  outColor = vec4(col * a, a);
}`;

// --- uniforms --------------------------------------------------------------
// Every uniform the shader declares, by name. Locations are typed from this
// list, so `u.uDpi` is a compile error rather than a silent no-op; the reverse
// (a name here that the shader lacks) is caught when the program links.

const UNIFORM_NAMES = [
  "uDpr", "uBufH", "uSize", "uPitch", "uRIn", "uRAct", "uThreshold", "uBinary", "uCIn", "uCAct", "uSource",
  "uPanelCount", "uRect", "uGrid", "uTS",
  "uBand", "uBandMotion", "uRipple", "uRippleC",
  "uIntCount", "uIntSrc", "uInt",
  "uImage", "uHasImage", "uImageSize", "uImageAdj", "uImageMotion", "uMotion", "uPush", "uPushSpan",
  "uRows", "uCols", "uStrips", "uStripSize",
] as const;

type UniformName = (typeof UNIFORM_NAMES)[number];
type Uniforms = Record<UniformName, WebGLUniformLocation | null>;

// --- GL plumbing -----------------------------------------------------------

interface Program {
  program: WebGLProgram;
  uniforms: Uniforms;
}

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | string {
  const shader = gl.createShader(type);
  if (!shader) return "Couldn't create a shader";
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "";
    console.error(`[dot-raster] ${type === gl.VERTEX_SHADER ? "vertex" : "fragment"} shader failed:\n${log}`);
    gl.deleteShader(shader);
    return "The dot shader failed to compile (see the console)";
  }
  return shader;
}

// Compile and link once per context; uniform locations are looked up here too.
function createProgram(gl: WebGL2RenderingContext): Program | string {
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  if (typeof vs === "string") return vs;
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (typeof fs === "string") {
    gl.deleteShader(vs);
    return fs;
  }
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(`[dot-raster] program failed to link:\n${gl.getProgramInfoLog(program) ?? ""}`);
    gl.deleteProgram(program);
    return "The dot shader failed to link (see the console)";
  }
  const active = new Set<string>();
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    if (info) active.add(info.name.replace(/\[0\]$/, ""));
  }
  const uniforms = {} as Uniforms;
  for (const name of UNIFORM_NAMES) {
    if (!active.has(name)) console.warn(`[dot-raster] uniform ${name} is not in the shader`);
    uniforms[name] = gl.getUniformLocation(program, name);
  }
  gl.useProgram(program);
  gl.disable(gl.BLEND);
  return { program, uniforms };
}

// --- uniform packing -------------------------------------------------------

// Deterministic noise: interference sources are placed from a seed, never
// Math.random, so the first frame is identical on every reload.
function pseudoRandom(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3 || h.length === 4) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return [0.5, 0.5, 0.5];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// Interference sources, in px from the grid centre. Seeded, so identical on reload.
function interferenceSources(count: number, seed: number, w: number, h: number): Float32Array {
  const out = new Float32Array(MAX_INTERFERENCE * 2);
  for (let i = 0; i < count; i++) {
    const rx = pseudoRandom(seed * 131 + i * 17.3 + 1);
    const ry = pseudoRandom(seed * 197 + i * 31.7 + 2);
    out[i * 2] = (0.15 + 0.7 * rx - 0.5) * w;
    out[i * 2 + 1] = (0.15 + 0.7 * ry - 0.5) * h;
  }
  return out;
}

// --- renderer --------------------------------------------------------------

// Returns null when it can't start; `hooks.onError` has then been called with
// the reason (WebGL2 missing, or the shader failed to build).
export function createDotRenderer(canvas: HTMLCanvasElement, hooks: DotRendererHooks): DotRenderer | null {
  const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) {
    hooks.onError("WebGL2 isn't available in this browser, so the dot grid can't render.");
    return null;
  }

  let prog: Program | null = null; // null while the context is lost or the shader failed
  let texture: WebGLTexture | null = null;
  let textureVersion = -1; // which setImage the texture holds; -1 = none
  let image: ImageBitmap | null = null;
  let imageVersion = 0;
  let pushTexture: WebGLTexture | null = null;
  let pushUploaded: { field: PushField; version: number } | null = null;
  // Row strips on texture unit 2, column strips on 3.
  const strips = [
    { unit: 2, texture: null as WebGLTexture | null, uploaded: null as { field: StripField; version: number } | null },
    { unit: 3, texture: null as WebGLTexture | null, uploaded: null as { field: StripField; version: number } | null },
  ];

  const rects = new Float32Array(MAX_PANELS * 4);
  const grids = new Float32Array(MAX_PANELS * 4);
  const ts = new Float32Array(MAX_PANELS * 2);

  // Built once per context; the texture is rebuilt lazily from `image`.
  const init = () => {
    texture = null;
    textureVersion = -1;
    pushTexture = null;
    pushUploaded = null;
    for (const s of strips) {
      s.texture = null;
      s.uploaded = null;
    }
    const made = createProgram(gl);
    if (typeof made === "string") {
      prog = null;
      hooks.onError(made);
    } else {
      prog = made;
    }
  };
  const onLost = (e: Event) => {
    e.preventDefault(); // opt in to restoration
    prog = null;
  };
  const onRestored = () => {
    init();
    hooks.onRestore();
  };
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);
  init();
  if (!prog) {
    // init() has reported why; don't leave listeners behind on a dead renderer.
    canvas.removeEventListener("webglcontextlost", onLost);
    canvas.removeEventListener("webglcontextrestored", onRestored);
    return null;
  }

  // Upload a newly set image once; the texture then lives on the GPU.
  const uploadImage = () => {
    if (!image || textureVersion === imageVersion) return;
    if (!texture) texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    textureVersion = imageVersion;
  };

  // The push field as an RG16F texture on unit 1: half floats are filterable
  // in core WebGL2, so the displacement interpolates smoothly between texels.
  const uploadPush = (field: PushField) => {
    if (pushUploaded?.field === field && pushUploaded.version === field.version) return;
    gl.activeTexture(gl.TEXTURE1);
    if (!pushTexture) {
      pushTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, pushTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    gl.bindTexture(gl.TEXTURE_2D, pushTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG16F, field.cols, field.rows, 0, gl.RG, gl.FLOAT, field.disp);
    pushUploaded = { field, version: field.version };
  };

  // Strip offsets as a count x 1 R16F texture, read by texelFetch.
  const uploadStrips = (slot: (typeof strips)[number], field: StripField) => {
    if (slot.uploaded?.field === field && slot.uploaded.version === field.version) return;
    gl.activeTexture(gl.TEXTURE0 + slot.unit);
    if (!slot.texture) {
      slot.texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, slot.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    }
    gl.bindTexture(gl.TEXTURE_2D, slot.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, field.offset.length, 1, 0, gl.RED, gl.FLOAT, field.offset);
    slot.uploaded = { field, version: field.version };
  };

  return {
    render(p, time, { brush, rows, columns }) {
      if (!prog || p.width <= 0 || gl.isContextLost()) return;
      const u = prog.uniforms;
      const { width: w, height: h } = p;

      const dpr = window.devicePixelRatio || 1;
      const bw = Math.round(w * dpr);
      const bh = Math.round(h * dpr);
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      gl.viewport(0, 0, bw, bh);

      const pitch = Math.max(2, p.grid.spacing);
      const panels = layoutPanels({ width: w, height: h, pitch, ...p.panels, t: time });
      panels.forEach(({ rect, grid, time: pt, scale }, i) => {
        rects.set([rect.x, rect.y, rect.w, rect.h], i * 4);
        grids.set([grid.x, grid.y, grid.cols, grid.rows], i * 4);
        ts.set([pt, scale], i * 2);
      });

      uploadImage();
      if (brush) uploadPush(brush);
      if (rows) uploadStrips(strips[0], rows);
      if (columns) uploadStrips(strips[1], columns);

      const source = Math.max(0, (SOURCES as readonly string[]).indexOf(p.source));
      const cIn = hexToRgb(p.inactiveColor);
      const cAct = hexToRgb(p.activeColor);
      gl.uniform1f(u.uDpr, dpr);
      gl.uniform1f(u.uBufH, bh);
      gl.uniform2f(u.uSize, w, h);
      gl.uniform1f(u.uPitch, pitch);
      gl.uniform1f(u.uRIn, Math.min(p.inactiveRadius, pitch / 2));
      gl.uniform1f(u.uRAct, Math.min(p.activeRadius, pitch / 2));
      gl.uniform1f(u.uThreshold, p.threshold);
      gl.uniform1i(u.uBinary, p.render === "binary" ? 1 : 0);
      gl.uniform3f(u.uCIn, cIn[0], cIn[1], cIn[2]);
      gl.uniform3f(u.uCAct, cAct[0], cAct[1], cAct[2]);
      gl.uniform1i(u.uSource, source);
      gl.uniform1i(u.uPanelCount, panels.length);
      gl.uniform4fv(u.uRect, rects);
      gl.uniform4fv(u.uGrid, grids);
      gl.uniform2fv(u.uTS, ts);
      gl.uniform4f(u.uBand, p.band.wavelength, p.band.amplitude, p.band.thickness, p.band.pitch);
      gl.uniform2f(u.uBandMotion, (p.band.angle * Math.PI) / 180, p.band.speed);
      gl.uniform3f(u.uRipple, p.ripple.wavelength, p.ripple.speed, p.ripple.falloff);
      gl.uniform2f(u.uRippleC, p.ripple.centerX, p.ripple.centerY);
      const n = Math.min(MAX_INTERFERENCE, Math.round(p.interference.count));
      gl.uniform1i(u.uIntCount, n);
      gl.uniform2fv(u.uIntSrc, interferenceSources(n, p.interference.seed, w, h));
      gl.uniform2f(u.uInt, p.interference.wavelength, p.interference.speed);
      gl.uniform1i(u.uImage, 0);
      gl.uniform1i(u.uHasImage, image && textureVersion >= 0 ? 1 : 0);
      gl.uniform2f(u.uImageSize, image?.width ?? 1, image?.height ?? 1);
      gl.uniform3f(u.uImageAdj, p.image.contrast, p.image.brightness, p.image.invert ? 1 : 0);
      gl.uniform1i(u.uImageMotion, Math.max(0, (IMAGE_MOTIONS as readonly string[]).indexOf(p.image.motion)));
      gl.uniform3f(u.uMotion, p.image.amount, Math.max(1, p.image.scale), p.image.speed);
      gl.uniform1i(u.uPush, 1);
      gl.uniform2f(u.uPushSpan, (brush?.cols ?? 1) * PUSH_CELL, (brush?.rows ?? 1) * PUSH_CELL);
      gl.uniform1i(u.uRows, strips[0].unit);
      gl.uniform1i(u.uCols, strips[1].unit);
      gl.uniform1i(u.uStrips, (rows ? 1 : 0) | (columns ? 2 : 0));
      gl.uniform2f(u.uStripSize, rows?.size ?? 1, columns?.size ?? 1);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },

    setImage(bitmap) {
      image?.close();
      image = bitmap;
      imageVersion += 1;
    },

    destroy() {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      if (prog) gl.deleteProgram(prog.program);
      gl.deleteTexture(texture);
      gl.deleteTexture(pushTexture);
      for (const s of strips) gl.deleteTexture(s.texture);
      prog = null;
      texture = null;
      pushTexture = null;
      for (const s of strips) s.texture = null;
      image?.close();
      image = null;
    },
  };
}
