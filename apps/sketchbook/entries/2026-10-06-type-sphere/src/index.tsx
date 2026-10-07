import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import { useDialKit } from "dialkit";
import { layoutWords, rowsFor } from "./layout.ts";
import type { Row, Span } from "./layout.ts";
import { covers, lightDirection, makeSolid, pointerLightDirection, SHAPES, shadeSolid } from "./shading.ts";
import type { ShapeKind, Solid } from "./shading.ts";

// Type sphere: after a 1970 Pirelli poster, a ball made of one word set in
// rows. Each word is sized by how dark the ball is where it lands, so it swells
// into the shadow and shrinks to a speck in the light. The ball can also be a
// cube, a tetrahedron or a donut.
//
//   light direction -> shadeSolid(point)           -> darkness in [0,1]
//   rowsFor(silhouette)                            -> spans per row
//   layoutWords(rows, words, darkness)             -> [{ text, x, y, scale, span }]
//   Canvas 2D clips each row to its spans and fills the words
//
// The light orbits the shape slowly on its own, or follows the pointer.
// Everything is analytic, so a frame depends only on the dials and where the
// light is; nothing is random.
//
// This file is the React shell: dials, canvas sizing, pointer and the frame
// loop. shading.ts is the Lambert maths and ray casting and layout.ts the row
// layout (both pure).
//
// Colours are literals rather than the playground's CSS variables so the
// sketch survives being lifted out of this repo. The canvas is the cream paper
// panel, sitting inside the dark stage.

const FONT_FAMILY = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const FONT_WEIGHT = 900;
const MEASURE_SIZE = 100; // words are measured, and drawn, at this font size
const CAP_CENTRE = 0.36; // the middle of a capital, in em above the baseline
const FILL = 1.15; // font size per px of row pitch: capitals nearly fill a row
const HEIGHT_MIN = 240;
// Silhouette rows are scanned this many px at a time, with each edge then
// bisected to a fraction of a pixel. Spinning rescans every frame, so it is as
// coarse as it can be without missing anything a row would show.
const SCAN_STEP = 4;
// While spinning, the shape also nods about the horizontal this far, at 0.6 of
// the spin rate, so it never passes through the same face-on poses.
const WOBBLE = 8;

const buttonStyle: CSSProperties = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid #333",
  background: "#1e2027",
  color: "inherit",
  cursor: "pointer",
};

// Word widths at MEASURE_SIZE, per font and word. Measuring is the slow part of
// a frame, and the same few words come round every frame.
const widths = new Map<string, number>();
function measureWord(ctx: CanvasRenderingContext2D, font: string, word: string): number {
  const key = `${font}\n${word}`;
  let w = widths.get(key);
  if (w === undefined) {
    w = ctx.measureText(word).width;
    widths.set(key, w);
  }
  return w;
}

// What is moving by itself. The light orbits unless it is following the pointer,
// and a sphere has nothing to spin: it looks the same from every side.
function motionOf(p: { shape: string; light: { source: string; orbitSpeed: number }; rotation: { spin: boolean; spinSpeed: number } }) {
  return {
    orbit: p.light.source === "orbit" && p.light.orbitSpeed !== 0,
    spin: p.rotation.spin && p.rotation.spinSpeed !== 0 && p.shape !== "sphere",
  };
}

export default function TypeSphere() {
  const p = useDialKit("Type sphere", {
    text: { type: "text", default: "Lorem ipsum dolor sit amet consectetur adipiscing elit" },
    uppercase: true,
    rowPitch: [14, 6, 40, 1],
    minScale: [0.17, 0.03, 1, 0.01],
    maxScale: [1, 0.3, 1.5, 0.01],
    wordGap: [0.3, 0, 1.5, 0.05],
    shape: { type: "select", options: [...SHAPES], default: "sphere" },
    thickness: [0.38, 0.1, 0.8, 0.01], // donut only: tube radius over major radius
    radius: [0.94, 0.3, 1, 0.01],
    height: [620, HEIGHT_MIN, 900, 10],
    // Turns on top of each shape's own tilt (the sphere ignores them), in
    // degrees about the screen's axes. Spin swings it round the vertical.
    rotation: {
      x: [0, -180, 180, 1],
      y: [0, -180, 180, 1],
      z: [0, -180, 180, 1],
      spin: false,
      spinSpeed: [30, -180, 180, 1],
    },
    light: {
      // orbit turns the light round by itself (angle, orbitSpeed and elevation
      // are for it); pointer aims it at the mouse, `height` units in front of
      // the screen. Only orbit moves on its own.
      source: { type: "select", options: ["orbit", "pointer"], default: "orbit" },
      height: [1, 0.2, 4, 0.05],
      elevation: [20, -80, 80, 1],
      angle: [45, 0, 360, 1],
      orbitSpeed: [10, -60, 60, 1],
      ambient: [0.04, 0, 0.8, 0.01],
      contrast: [1, 0.3, 3, 0.05],
    },
    paper: { type: "color", default: "#ebe6da" },
    ink: { type: "color", default: "#0c0c0c" },
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(0); // degrees the light has orbited since the start
  const spinRef = useRef(0); // degrees the shape has spun since the start
  // Where the pointer last was, in radius units from the centre, y up. It is
  // held when the pointer leaves, and starts at the upper right.
  const pointerRef = useRef({ x: 0.8, y: 0.5 });
  const pointerRaf = useRef(0);
  // The silhouette changes with the shape, its turn and its size, not the
  // light, so its rows are worked out once and reused while only the light
  // moves. A spin changes the turn every frame, so it rescans every frame.
  const silhouette = useRef<{ key: string; solid: Solid; rows: Row[] } | null>(null);
  const loop = useRef<{ raf: number; last: number | null }>({ raf: 0, last: null });

  const [width, setWidth] = useState(0);
  const [playing, setPlaying] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  const height = Math.max(HEIGHT_MIN, Math.round(p.height));
  const orbiting = p.light.source === "orbit";
  const motion = motionOf(p);
  const canPlay = motion.orbit || motion.spin;
  const animating = playing && canPlay;

  // Always-current snapshot for the rAF loop, which must not re-subscribe on
  // every dial tick.
  const state = useRef({ p, width, height, animating });
  state.current = { p, width, height, animating };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    setWidth(Math.floor(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);

  // Reduced motion can change while the page is open: follow it, but only to
  // stop, never to start something the reader paused.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => mq.matches && setPlaying(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const draw = () => {
    const { p, width: w, height: h } = state.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || w <= 0) return;

    // Back the canvas with device pixels, but draw in CSS pixels.
    const dpr = window.devicePixelRatio || 1;
    const bw = Math.round(w * dpr);
    const bh = Math.round(h * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = p.paper;
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const radius = (Math.min(w, h) / 2) * p.radius;

    const light = p.light.source === "orbit"
      ? lightDirection(p.light.angle + phaseRef.current, p.light.elevation)
      : pointerLightDirection(pointerRef.current.x, pointerRef.current.y, p.light.height);
    const shape: ShapeKind = (SHAPES as readonly string[]).includes(p.shape)
      ? (p.shape as ShapeKind)
      : "sphere";

    // Every shape fits the unit circle however it is turned, so `radius` sizes
    // it, and its silhouette is read in radius units.
    const spin = p.rotation.spin ? spinRef.current : 0;
    const turn = {
      x: p.rotation.x + (p.rotation.spin ? WOBBLE * Math.sin((spin * 0.6 * Math.PI) / 180) : 0),
      y: p.rotation.y + spin,
      z: p.rotation.z,
    };
    const key = [shape, p.thickness, turn.x, turn.y, turn.z, cx, cy, radius, p.rowPitch].join("|");
    let sil = silhouette.current;
    if (!sil || sil.key !== key) {
      const solid = makeSolid(shape, p.thickness, turn);
      const rows = rowsFor(
        {
          cx,
          cy,
          radius,
          rowPitch: p.rowPitch,
          inside: (x, y) => covers(solid, (x - cx) / radius, (y - cy) / radius),
        },
        SCAN_STEP,
      );
      sil = silhouette.current = { key, solid, rows };
    }
    const { solid, rows } = sil;
    const darkness = (x: number, y: number) =>
      shadeSolid(solid, (x - cx) / radius, (y - cy) / radius, light, p.light.ambient, p.light.contrast)
        .darkness;

    const font = `${FONT_WEIGHT} ${MEASURE_SIZE}px ${FONT_FAMILY}`;
    ctx.font = font;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";

    const unit = p.rowPitch * FILL; // font size at scale 1
    const k = unit / MEASURE_SIZE; // px per measured px at scale 1
    const words = p.text.split(/\s+/).filter(Boolean);
    const shown = p.uppercase ? words.map((s) => s.toUpperCase()) : words;
    const placed = layoutWords({
      cx,
      cy,
      radius,
      rowPitch: p.rowPitch,
      rows,
      words: shown,
      measure: (word) => measureWord(ctx, font, word) * k,
      darkness,
      minScale: p.minScale,
      maxScale: Math.max(p.minScale, p.maxScale),
      wordGap: p.wordGap * unit,
    });

    // Clip each row to its span, one row tall: the last word of a span runs off
    // the edge, and the edges come out ragged, as on the poster. Words arrive
    // grouped by span, so the clip changes only when the span does.
    ctx.fillStyle = p.ink;
    let clipped: Span | null = null;
    for (const word of placed) {
      if (word.span !== clipped) {
        if (clipped) ctx.restore();
        clipped = word.span;
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.beginPath();
        ctx.rect(clipped.x0, word.y - p.rowPitch / 2, clipped.x1 - clipped.x0, p.rowPitch);
        ctx.clip();
      }
      // Set the font once and scale the transform per word: re-parsing a font
      // string for thousands of words a frame costs far more.
      const s = k * word.scale;
      ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * word.x, dpr * word.y);
      ctx.fillText(word.text, 0, CAP_CENTRE * MEASURE_SIZE);
    }
    if (clipped) ctx.restore();
  };
  const drawRef = useRef(draw);
  drawRef.current = draw;

  // The orbit and the spin advance only while animating, so pausing freezes
  // them and the first frame is always the starting pose.
  const tick = (now: number) => {
    const l = loop.current;
    const dt = l.last === null ? 0 : Math.min(0.1, (now - l.last) / 1000);
    l.last = now;
    const { p, animating } = state.current;
    if (animating) {
      const m = motionOf(p);
      if (m.orbit) phaseRef.current += p.light.orbitSpeed * dt;
      if (m.spin) spinRef.current += p.rotation.spinSpeed * dt;
    }
    drawRef.current();
    if (animating) {
      l.raf = requestAnimationFrame((t) => tickRef.current(t));
    } else {
      l.raf = 0;
      l.last = null;
    }
  };
  const tickRef = useRef(tick);
  tickRef.current = tick;

  useEffect(() => {
    if (animating && !loop.current.raf) {
      loop.current.raf = requestAnimationFrame((t) => tickRef.current(t));
    }
  }, [animating]);
  useEffect(
    () => () => {
      cancelAnimationFrame(loop.current.raf);
      cancelAnimationFrame(pointerRaf.current);
    },
    [],
  );

  // Pointer light: aim at the pointer, in radius units from the shape's centre,
  // and redraw once per frame however fast the pointer reports. It works under
  // reduced motion, since the reader is the one moving it, and it holds its
  // last aim when the pointer leaves.
  const aimLight = (e: PointerEvent<HTMLCanvasElement>) => {
    const { p, width: w, height: h } = state.current;
    if (p.light.source !== "pointer" || w <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const radius = (Math.min(w, h) / 2) * p.radius;
    pointerRef.current = {
      x: (e.clientX - rect.left - w / 2) / radius,
      y: -(e.clientY - rect.top - h / 2) / radius,
    };
    if (!pointerRaf.current && !loop.current.raf) {
      pointerRaf.current = requestAnimationFrame(() => {
        pointerRaf.current = 0;
        drawRef.current();
      });
    }
  };

  // When the loop is idle (paused, reduced motion), repaint on every render
  // instead: a dial change or a resize.
  useEffect(() => {
    if (!loop.current.raf) drawRef.current();
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "stretch" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          onClick={() => setPlaying((v) => !v)}
          disabled={!canPlay}
          title={canPlay ? undefined : "Nothing is moving by itself"}
          style={{
            ...buttonStyle,
            opacity: canPlay ? 1 : 0.5,
            cursor: canPlay ? "pointer" : "default",
          }}
        >
          {animating ? "pause" : "play"}
        </button>
      </div>
      <div ref={containerRef} style={{ width: "100%", height }}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`A ${p.shape === "triangle" ? "tetrahedron" : p.shape} made of rows of words, large in the shadow and small in the light`}
          onPointerMove={aimLight}
          onPointerDown={aimLight}
          style={{
            display: "block",
            width,
            height,
            borderRadius: 4,
            cursor: orbiting ? "default" : "crosshair",
          }}
        />
      </div>
    </div>
  );
}
