import type { Atlas } from "./atlas.ts";
import { cellWidthPx, MAX_ROW_CELLS, packedHalfRows, packedLayout, sphereRadiusPx } from "./sphere.ts";
import type { Vec3 } from "./sphere.ts";

// The WebGL2 side of the word sphere: GLSL, compile and link, context loss,
// drawing-buffer sizing, the mark atlas texture and uniform packing. The sketch
// sees only createSphereRenderer(); nothing here touches React.
//
// The whole pipeline lives in one fragment shader over a full-screen triangle:
// each pixel finds its row and cell, shades the sphere at that cell's centre
// (one value per cell), turns the shade into ink and draws the mark. Cost
// depends on pixel count, not mark count. JS only works out the cell width and
// the sphere's radius, and uploads uniforms; sphere.ts holds the same maths in JS.
//
// Cells sit on a fixed grid by default; with `pack` they sit end to end instead,
// which a pixel can't find by division. sphere.ts lays those rows out (cheap:
// cells, not pixels) and this file uploads the result as a texture for the
// shader to search.

// What one frame needs, in CSS pixels. The sketch's dial values fit this shape;
// the light is separate because it eases rather than being a dial.
export interface SphereParams {
  width: number;
  height: number;
  ink: string;
  paper: string;
  paperOn: boolean;
  sphere: { radius: number }; // fraction of min(width, height), pulled in to fit the marks
  light: { ambient: number; diffuse: number; specular: number; shininess: number; rim: number };
  grid: { rowHeight: number; fill: number; cellWidth: number; stagger: number; alignLeft: boolean; pack: boolean };
  tone: { invert: boolean; gamma: number; contrast: number; minScale: number; cutoff: number };
}

export interface SphereRenderer {
  // Draw one frame, lit from the unit vector `light` (x right, y up, z at the
  // viewer).
  render(params: SphereParams, light: Vec3): void;
  // Hand over the mark atlas, or null for none. The renderer keeps it: it
  // uploads on the next render and again after a context restore. An atlas
  // with `chars` is a ramp (one character per cell, chosen by ink); any other
  // is one mark per cell, scaled by ink.
  setAtlas(atlas: Atlas | null): void;
  destroy(): void;
}

export interface SphereRendererHooks {
  // Something stopped the sphere drawing; the message is ready to show.
  onError(message: string): void;
  // The context came back and is rebuilt; draw again.
  onRestore(): void;
}

// --- shaders ---------------------------------------------------------------
// Coordinates are CSS pixels from the canvas's top-left, y down, like sphere.ts.
// Rows are centred on the sphere; a pixel's cell is the one under it on its row.

const VERT = `#version 300 es
void main() {
  // One oversized triangle covers the viewport; no buffers needed.
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
precision highp int;

uniform float uDpr;         // drawing-buffer px per CSS px
uniform float uBufH;        // drawing-buffer height, to flip gl_FragCoord
uniform vec2 uCentre;       // sphere centre, CSS px
uniform float uRadius;      // sphere radius, CSS px
uniform vec3 uLight;        // unit vector toward the light
uniform vec4 uShade;        // ambient, diffuse, specular, shininess
uniform float uRim;
uniform vec4 uTone;         // invert, gamma, contrast, cutoff
uniform float uMinScale;
uniform vec4 uRow;          // row height, cell width, stagger, align left
uniform vec4 uMark;         // aspect, tiles, ramp, mark height at full size
uniform vec3 uInk;
uniform vec3 uPaper;
uniform int uPaperOn;
uniform sampler2D uAtlas;
uniform int uHasAtlas;
uniform vec3 uPack;         // packed layout on, half rows, cell width multiplier
uniform sampler2D uLayout;  // packed: (anchor, pitch) per cell, one row per texture row

const int MAX_ROW_CELLS = ${MAX_ROW_CELLS};

out vec4 outColor;

// Lambert + ambient, optional Blinn-Phong and rim. Mirrors shade() in sphere.ts.
float shade(vec3 n) {
  float diff = max(dot(n, uLight), 0.0);
  vec3 hv = uLight + vec3(0.0, 0.0, 1.0);
  float hl = length(hv);
  vec3 h = hl < 1e-6 ? vec3(0.0, 0.0, 1.0) : hv / hl;
  float spec = diff > 0.0 ? pow(max(dot(n, h), 0.0), max(1.0, uShade.w)) : 0.0;
  float rim = pow(1.0 - n.z, 3.0);
  return clamp(uShade.x + uShade.y * diff + uShade.z * spec + uRim * rim, 0.0, 1.0);
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uBufH - gl_FragCoord.y) / uDpr;

  // Premultiplied output: paper fills the canvas, or nothing does and the stage
  // shows through.
  vec4 bg = uPaperOn == 1 ? vec4(uPaper, 1.0) : vec4(0.0);
  outColor = bg;
  if (uHasAtlas == 0) return;

  // Row: evenly spaced, centred on the sphere. Mirrors cellAt() in sphere.ts.
  float rowH = uRow.x;
  float cellW = uRow.y;
  float row = floor((px.y - uCentre.y) / rowH + 0.5);
  float yc = uCentre.y + row * rowH;
  float dy = yc - uCentre.y;
  if (abs(dy) > uRadius) return;

  float ax;
  float cx; // where this cell's shade is taken
  if (uPack.x > 0.5) {
    // Packed: the row's cells were laid end to end in JS. Find the last one
    // that starts at or before this pixel by binary search. Mirrors
    // packedCellAt() in sphere.ts.
    int half_ = int(uPack.y);
    int r = int(row) + half_;
    if (r < 0 || r > 2 * half_) return;
    if (texelFetch(uLayout, ivec2(0, r), 0).r > px.x) return;
    int lo = 0;
    int hi = MAX_ROW_CELLS - 1;
    for (int i = 0; i < 9; i++) {
      if (lo >= hi) break;
      int mid = (lo + hi + 1) >> 1;
      if (texelFetch(uLayout, ivec2(mid, r), 0).r <= px.x) lo = mid; else hi = mid - 1;
    }
    vec2 cell = texelFetch(uLayout, ivec2(lo, r), 0).rg;
    if (cell.x >= 1e8 || px.x >= cell.x + cell.y) return;
    ax = cell.x;
    cx = ax + cell.y / (2.0 * uPack.z); // the pitch is the drawn mark's width times the multiplier
  } else {
    // Fixed grid: cells start on the sphere's left edge at this row (the
    // poster's ragged circle) or on the bounding edge; odd rows shift by the
    // stagger. Mirrors cellAt() in sphere.ts.
    bool align = uRow.w > 0.5;
    float edge = uCentre.x - (align ? sqrt(uRadius * uRadius - dy * dy) : uRadius);
    float off = mod(row, 2.0) * uRow.z * cellW;
    float col = floor((px.x - edge - off) / cellW);
    if (align && col < 0.0) return;
    ax = edge + off + col * cellW;
    cx = ax + 0.5 * cellW;
  }
  if (length(vec2(ax, yc) - uCentre) > uRadius + 0.75) return;

  // One shade per cell, taken at its centre and held to the disc so a cell that
  // pokes past the rim still has a normal.
  vec2 s = vec2(cx, yc) - uCentre;
  float r = length(s);
  if (r > 0.995 * uRadius) s *= 0.995 * uRadius / r;
  vec3 n = vec3(s.x, -s.y, 0.0) / uRadius;
  n.z = sqrt(max(0.0, 1.0 - dot(n.xy, n.xy)));

  float ink = uTone.x > 0.5 ? 1.0 - shade(n) : shade(n);
  ink = clamp((ink - 0.5) * uTone.z + 0.5, 0.0, 1.0);
  ink = pow(ink, max(0.01, uTone.y));
  if (ink < uTone.w) return;

  // The mark: a ramp draws full size and lets ink choose the character; a
  // single mark is scaled by ink, anchored at its left-centre.
  bool ramp = uMark.z > 0.5;
  float tiles = uMark.y;
  float mh = uMark.w * (ramp ? 1.0 : mix(uMinScale, 1.0, ink));
  float mw = mh * uMark.x;
  vec2 uv = (px - vec2(ax, yc - 0.5 * mh)) / vec2(mw, mh);
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return;

  // uv jumps at every cell edge, so the screen derivatives would blow up there
  // and shimmer. The mark is a plain scale of the atlas, so its footprint is
  // known: uv change per device pixel.
  vec2 grad = 1.0 / (vec2(mw, mh) * uDpr);
  if (ramp) {
    float idx = min(tiles - 1.0, floor(ink * tiles));
    uv.x = (idx + uv.x) / tiles;
    grad.x /= tiles;
  }
  float a = textureGrad(uAtlas, uv, vec2(grad.x, 0.0), vec2(0.0, grad.y)).r;
  outColor = uPaperOn == 1 ? vec4(mix(uPaper, uInk, a), 1.0) : vec4(uInk * a, a);
}`;

// --- uniforms --------------------------------------------------------------
// Every uniform the shader declares, by name. Locations are typed from this
// list, so `u.uDpi` is a compile error rather than a silent no-op; the reverse
// (a name here that the shader lacks) is caught when the program links.

const UNIFORM_NAMES = [
  "uDpr", "uBufH", "uCentre", "uRadius", "uLight", "uShade", "uRim", "uTone", "uMinScale",
  "uRow", "uMark", "uInk", "uPaper", "uPaperOn", "uAtlas", "uHasAtlas", "uPack", "uLayout",
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
    console.error(`[word-sphere] ${type === gl.VERTEX_SHADER ? "vertex" : "fragment"} shader failed:\n${log}`);
    gl.deleteShader(shader);
    return "The sphere shader failed to compile (see the console)";
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
    console.error(`[word-sphere] program failed to link:\n${gl.getProgramInfoLog(program) ?? ""}`);
    gl.deleteProgram(program);
    return "The sphere shader failed to link (see the console)";
  }
  const active = new Set<string>();
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    if (info) active.add(info.name.replace(/\[0\]$/, ""));
  }
  const uniforms = {} as Uniforms;
  for (const name of UNIFORM_NAMES) {
    if (!active.has(name)) console.warn(`[word-sphere] uniform ${name} is not in the shader`);
    uniforms[name] = gl.getUniformLocation(program, name);
  }
  gl.useProgram(program);
  gl.disable(gl.BLEND);
  return { program, uniforms };
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

// --- renderer --------------------------------------------------------------

// Returns null when it can't start; `hooks.onError` has then been called with
// the reason (WebGL2 missing, or the shader failed to build).
export function createSphereRenderer(canvas: HTMLCanvasElement, hooks: SphereRendererHooks): SphereRenderer | null {
  const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) {
    hooks.onError("WebGL2 isn't available in this browser, so the sphere can't render.");
    return null;
  }

  let prog: Program | null = null; // null while the context is lost or the shader failed
  let texture: WebGLTexture | null = null;
  let textureVersion = -1; // which setAtlas the texture holds; -1 = none
  let atlas: Atlas | null = null;
  let atlasVersion = 0;
  let layoutTexture: WebGLTexture | null = null;
  let layoutBuffer: Float32Array | undefined; // reused between frames

  // Built once per context; the textures are rebuilt lazily.
  const init = () => {
    texture = null;
    textureVersion = -1;
    layoutTexture = null;
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

  // Upload a newly set atlas once as a single-channel texture; it then lives on
  // the GPU. Mipmapped, so a mark drawn small is averaged rather than aliased.
  const uploadAtlas = () => {
    if (!atlas || textureVersion === atlasVersion) return;
    if (!texture) texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); // rows of bytes are not 4-aligned
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, atlas.width, atlas.height, 0, gl.RED, gl.UNSIGNED_BYTE, atlas.mask);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    textureVersion = atlasVersion;
  };

  // The packed layout as an RG32F texture on unit 1, a row of cells per texture
  // row, read with texelFetch so it needs no filtering. Re-sent every frame:
  // the light can move any of it.
  const uploadLayout = (layout: { data: Float32Array; rows: number }) => {
    gl.activeTexture(gl.TEXTURE1);
    if (!layoutTexture) {
      layoutTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, layoutTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    gl.bindTexture(gl.TEXTURE_2D, layoutTexture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, MAX_ROW_CELLS, layout.rows, 0, gl.RG, gl.FLOAT, layout.data);
  };

  return {
    render(p, light) {
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

      uploadAtlas();
      const ready = !!atlas && textureVersion === atlasVersion;

      const cx = w / 2;
      const cy = h / 2;
      const rowHeight = Math.max(2, p.grid.rowHeight);
      const fill = p.grid.fill;
      const aspect = atlas?.aspect ?? 1;
      const radius = sphereRadiusPx(p.sphere.radius, w, h, rowHeight, fill, aspect);
      const ink = hexToRgb(p.ink);
      const paper = hexToRgb(p.paper);

      gl.uniform1f(u.uDpr, dpr);
      gl.uniform1f(u.uBufH, bh);
      gl.uniform2f(u.uCentre, cx, cy);
      gl.uniform1f(u.uRadius, radius);
      gl.uniform3f(u.uLight, light[0], light[1], light[2]);
      gl.uniform4f(u.uShade, p.light.ambient, p.light.diffuse, p.light.specular, p.light.shininess);
      gl.uniform1f(u.uRim, p.light.rim);
      gl.uniform4f(u.uTone, p.tone.invert ? 1 : 0, p.tone.gamma, p.tone.contrast, p.tone.cutoff);
      gl.uniform1f(u.uMinScale, p.tone.minScale);
      gl.uniform4f(
        u.uRow,
        rowHeight,
        cellWidthPx(rowHeight, fill, aspect, p.grid.cellWidth),
        p.grid.stagger,
        p.grid.alignLeft ? 1 : 0,
      );
      gl.uniform4f(u.uMark, aspect, atlas?.tiles ?? 1, atlas && atlas.chars.length > 0 ? 1 : 0, rowHeight * fill);
      gl.uniform3f(u.uInk, ink[0], ink[1], ink[2]);
      gl.uniform3f(u.uPaper, paper[0], paper[1], paper[2]);
      gl.uniform1i(u.uPaperOn, p.paperOn ? 1 : 0);
      gl.uniform1i(u.uAtlas, 0);
      gl.uniform1i(u.uHasAtlas, ready ? 1 : 0);

      // Packed layout applies to a single mark that scales; a ramp's characters
      // are all one size, so a fixed grid already packs them.
      const ramp = !!atlas && atlas.chars.length > 0;
      const packed = ready && p.grid.pack && !ramp;
      if (packed) {
        const layout = packedLayout(
          {
            cx,
            cy,
            radius,
            rowHeight,
            fullWidth: rowHeight * fill * aspect,
            cellWidth: p.grid.cellWidth,
            minScale: p.tone.minScale,
            alignLeft: p.grid.alignLeft,
          },
          light,
          p.light,
          p.tone,
          layoutBuffer,
        );
        layoutBuffer = layout.data;
        uploadLayout(layout);
      }
      gl.uniform3f(u.uPack, packed ? 1 : 0, packedHalfRows(radius, rowHeight), Math.max(0.01, p.grid.cellWidth));
      gl.uniform1i(u.uLayout, 1);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },

    setAtlas(next) {
      if (next === atlas) return;
      atlas = next;
      atlasVersion += 1;
    },

    destroy() {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      if (prog) gl.deleteProgram(prog.program);
      gl.deleteTexture(texture);
      gl.deleteTexture(layoutTexture);
      prog = null;
      texture = null;
      layoutTexture = null;
      atlas = null;
    },
  };
}
