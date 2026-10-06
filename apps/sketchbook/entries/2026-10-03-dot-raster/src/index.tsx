import { useEffect, useRef, useState } from "react";
import type { CSSProperties, DragEvent, PointerEvent } from "react";
import { useDialKitController } from "dialkit";
import { layoutPanels, panelAt } from "./layout.ts";
import {
  agitatorAt,
  createPushField,
  createStripField,
  MAX_AGITATORS,
  PUSH_SHAPES,
  pushAt,
  pushStrip,
  randomShapeAt,
  stepPushField,
  stepStripField,
} from "./push.ts";
import type { PushField, PushShape, StripAxis, StripField } from "./push.ts";
import { createDotRenderer, IMAGE_MOTIONS, SOURCES } from "./renderer.ts";
import type { DotRenderer } from "./renderer.ts";
import exampleUrl from "./example.png";

// Dot raster: a source makes a scalar field in [0,1] per grid cell, a render
// mode turns that value into a dot radius + colour, and one WebGL2 <canvas>
// draws it.
//
//   source (band | ripple | interference | image) -> field(cell) -> v
//   render (binary | halftone)                    -> v -> radius, colour
//
// The image source can move: an ambient `motion` displaces where each dot
// samples the picture over time, and pushes drag pixels around, with springs
// pulling them home. The pointer pushes; so do `agitators`, seeded wanderers
// that stir the picture on their own while it plays.
//
// This file is the React shell: dials, buttons, image loading, pointer input
// and the frame loop. layout.ts works out the panels and push.ts the push
// field (both pure maths); renderer.ts owns WebGL and the shader.
//
// Colours are literals rather than the playground's CSS variables so the
// sketch survives being lifted out of this repo. They assume the dark stage.

const STAGE_HEIGHT_MIN = 200;

const buttonStyle: CSSProperties = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid #333",
  background: "#1e2027",
  color: "inherit",
  cursor: "pointer",
};

export default function DotRaster() {
  // The controller (not plain useDialKit) so loading an image can flip the
  // `source` select from code.
  const { values: p, setValue } = useDialKitController("Dot raster", {
    source: { type: "select", options: [...SOURCES], default: "band" },
    render: { type: "select", options: ["binary", "halftone"], default: "binary" },
    threshold: [0.5, 0, 1, 0.01],
    inactiveColor: { type: "color", default: "#566074" },
    activeColor: { type: "color", default: "#3d7cf2" },
    inactiveRadius: [1.6, 0.4, 8, 0.1],
    activeRadius: [6.4, 1, 20, 0.1],
    grid: {
      spacing: [16, 6, 40, 1],
      height: [440, STAGE_HEIGHT_MIN, 800, 10],
    },
    panels: {
      multiPanel: false,
      cols: [2, 1, 4, 1],
      rows: [2, 1, 4, 1],
      gap: [24, 0, 80, 1],
      lag: [60, 0, 120, 1],
    },
    band: {
      wavelength: [900, 120, 1600, 10],
      amplitude: [110, 0, 300, 5],
      thickness: [150, 20, 400, 5],
      angle: [-28, -90, 90, 1],
      speed: [0.08, -1, 1, 0.01],
      pitch: [300, 120, 900, 10],
    },
    ripple: {
      wavelength: [130, 30, 400, 5],
      speed: [0.2, -1, 1, 0.01],
      falloff: [0.5, 0, 3, 0.05],
      centerX: [0.5, 0, 1, 0.01],
      centerY: [0.5, 0, 1, 0.01],
    },
    interference: {
      count: [3, 2, 4, 1],
      wavelength: [150, 40, 500, 5],
      speed: [0.15, -1, 1, 0.01],
      seed: [7, 0, 50, 1],
    },
    image: {
      invert: true,
      contrast: [1.2, 0, 3, 0.05],
      brightness: [0, -0.5, 0.5, 0.01],
      motion: { type: "select", options: [...IMAGE_MOTIONS], default: "flow" },
      amount: [10, 0, 80, 1],
      scale: [260, 20, 800, 10],
      speed: [0.1, -1, 1, 0.01],
    },
    push: {
      // brush carries a round patch; rows and columns slide whole strips of
      // the picture, `strip` dot rows (or columns) thick. random hops between
      // the three, holding each for holdMin..holdMax seconds.
      shape: { type: "select", options: [...PUSH_SHAPES, "random"], default: "brush" },
      strip: [2, 1, 24, 1],
      holdMin: [0.6, 0.1, 10, 0.1],
      holdMax: [2.5, 0.1, 10, 0.1],
      radius: [70, 10, 300, 5],
      strength: [1, 0, 3, 0.05],
      stiffness: [40, 5, 400, 5],
      damping: [0.3, 0.05, 1.5, 0.01],
      auto: true,
      agitators: [2, 1, MAX_AGITATORS, 1],
      pace: [0.12, 0, 0.6, 0.01],
    },
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const rendererRef = useRef<DotRenderer | null>(null);
  const timeRef = useRef(0);
  const dragDepth = useRef(0);
  const loadToken = useRef(0);
  const pushRef = useRef<PushField | null>(null);
  const stripRef = useRef<Record<StripAxis, StripField | null>>({ rows: null, columns: null });
  const pointer = useRef<{ x: number; y: number } | null>(null); // last position, canvas px
  const loop = useRef<{ raf: number; last: number | null }>({ raf: 0, last: null });

  const [width, setWidth] = useState(0);
  const [playing, setPlaying] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [imageName, setImageName] = useState<string | null>(null);
  const [, bumpImage] = useState(0); // re-render after a load so a paused sketch repaints
  const [error, setError] = useState<string | null>(null);
  const [glError, setGlError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const height = Math.max(STAGE_HEIGHT_MIN, Math.round(p.grid.height));
  const isImage = p.source === "image";
  const canPlay = !isImage || p.image.motion !== "still" || p.push.auto;
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

  // Renderer: created once, and it rebuilds itself if the browser takes the GL
  // context away and gives it back. Declared before the draw effects so the
  // first paint has a program.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = createDotRenderer(canvas, {
      onError: setGlError,
      onRestore: () => drawRef.current(),
    });
    rendererRef.current = renderer;
    void loadImage(
      fetch(exampleUrl).then((r) => r.blob()),
      "example.png",
      false,
    );
    return () => {
      loadToken.current += 1; // a decode still in flight is now stale
      renderer?.destroy();
      rendererRef.current = null;
    };
  }, []);

  // The push field matches the composition; a resize starts a fresh one.
  const pushField = (w: number, h: number) => {
    const f = pushRef.current;
    if (f && f.width === w && f.height === h) return f;
    return (pushRef.current = w > 0 ? createPushField(w, h) : null);
  };

  // The strip field for an axis, sized in composition px (whole dot rows at
  // full size); a resize or a new strip size starts a fresh one. Rows and
  // columns are kept apart, so switching shape lets each spring home.
  const stripField = (axis: StripAxis, w: number, h: number) => {
    const { p } = state.current;
    const f = stripRef.current[axis];
    const size = Math.round(p.push.strip) * Math.max(2, p.grid.spacing);
    if (f && f.width === w && f.height === h && f.size === size) return f;
    return (stripRef.current[axis] = w > 0 ? createStripField(w, h, axis, size) : null);
  };

  // The shape pushing right now. random follows the play clock, so pausing
  // holds its current pick.
  const currentShape = (): PushShape => {
    const { push } = state.current.p;
    if (push.shape !== "random") return push.shape as PushShape;
    return randomShapeAt(timeRef.current, push.holdMin, push.holdMax);
  };

  // One push, from the pointer or an agitator, into whichever shape is on.
  // Positions and moves are composition px.
  const applyPush = (x: number, y: number, dx: number, dy: number) => {
    const { p, width: w, height: h } = state.current;
    const shape = currentShape();
    if (shape === "brush") {
      const f = pushField(w, h);
      if (f) pushAt(f, x, y, dx, dy, p.push.radius, p.push.strength);
    } else {
      const f = stripField(shape, w, h);
      if (f) pushStrip(f, x, y, dx, dy, p.push.strength);
    }
  };

  const draw = () => {
    const { p, width: w, height: h } = state.current;
    const { rows, columns } = stripRef.current;
    rendererRef.current?.render({ ...p, width: w, height: h }, timeRef.current, {
      brush: pushField(w, h),
      // A field from before a resize is left out: its strips no longer fit.
      rows: rows && rows.width === w && rows.height === h ? rows : null,
      columns: columns && columns.width === w && columns.height === h ? columns : null,
    });
  };
  const drawRef = useRef(draw);
  drawRef.current = draw;

  // One frame loop for two clocks. Time advances only while animating, so
  // pausing freezes the phase and the first frame is always t = 0. The push
  // springs run whenever they're unsettled, paused or not, since the pointer
  // set them moving. The loop stops itself once neither needs it.
  const tick = (now: number) => {
    const l = loop.current;
    const dt = l.last === null ? 0 : Math.min(0.1, (now - l.last) / 1000);
    l.last = now;
    const { p, width: w, height: h, animating } = state.current;
    const t0 = timeRef.current;
    if (animating) timeRef.current += dt;
    // Agitators push by however far their path moved this frame, so they stop
    // when time does.
    if (animating && dt > 0 && p.source === "image" && p.push.auto) {
      for (let i = 0; i < Math.round(p.push.agitators); i++) {
        const a = agitatorAt(i, t0, w, h, p.push.pace);
        const b = agitatorAt(i, timeRef.current, w, h, p.push.pace);
        applyPush(b.x, b.y, b.x - a.x, b.y - a.y);
      }
    }
    const { stiffness, damping } = p.push;
    const { rows, columns } = stripRef.current;
    // Every shape steps every frame, so switching shape lets the old one settle.
    let pushing = pushRef.current ? stepPushField(pushRef.current, dt, stiffness, damping) : false;
    if (rows && stepStripField(rows, dt, stiffness, damping)) pushing = true;
    if (columns && stepStripField(columns, dt, stiffness, damping)) pushing = true;
    drawRef.current();
    if (animating || pushing) {
      l.raf = requestAnimationFrame((t) => tickRef.current(t));
    } else {
      l.raf = 0;
      l.last = null;
    }
  };
  const tickRef = useRef(tick);
  tickRef.current = tick;
  const startLoop = () => {
    if (!loop.current.raf) loop.current.raf = requestAnimationFrame((t) => tickRef.current(t));
  };

  useEffect(() => {
    if (animating) startLoop();
  }, [animating]);
  useEffect(() => () => cancelAnimationFrame(loop.current.raf), []);

  // When the loop is idle, repaint on every render (dial change, resize, new
  // image) instead.
  useEffect(() => {
    if (!loop.current.raf) drawRef.current();
  });

  // Hover pushes the picture: the pointer's movement since the last event is
  // added to the field under it, in composition px so it lands the same in
  // every panel.
  const onPointerMove = (e: PointerEvent) => {
    const { p, width: w, height: h } = state.current;
    const box = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    const prev = pointer.current;
    pointer.current = { x, y };
    if (!prev || p.source !== "image") return;
    const panels = layoutPanels({ width: w, height: h, pitch: p.grid.spacing, ...p.panels, t: 0 });
    const at = panelAt(panels, w, h, x, y);
    if (!at) return;
    applyPush(at.x, at.y, (x - prev.x) / at.scale, (y - prev.y) / at.scale);
    startLoop();
  };
  const onPointerLeave = () => {
    pointer.current = null;
  };

  // Latest load wins: one that resolves after a newer load started (or after
  // unmount) is dropped, and its bitmap closed. The token is taken before the
  // first await, so a slow example fetch can't overwrite a dropped image.
  // `select` flips the source to image; the example preload leaves it alone.
  async function loadImage(source: Blob | Promise<Blob>, name: string, select: boolean) {
    const token = ++loadToken.current;
    try {
      const blob = await source;
      if (!blob.type.startsWith("image/")) {
        if (token === loadToken.current) setError("That file isn't an image");
        return;
      }
      // Held in memory only: decoded to a bitmap (premultiplied, so transparent
      // pixels read as black) and uploaded to the GPU, never stored.
      const bitmap = await createImageBitmap(blob, { premultiplyAlpha: "premultiply" });
      const renderer = rendererRef.current;
      if (token !== loadToken.current || !renderer) {
        bitmap.close();
        return;
      }
      renderer.setImage(bitmap);
      bumpImage((v) => v + 1);
      setImageName(name);
      setError(null);
      if (select) setValue("source", "image");
    } catch {
      if (token === loadToken.current) setError("Couldn't read that image");
    }
  }

  const loadFile = (file: File | undefined) => {
    if (file) void loadImage(file, file.name, true);
  };

  const onDragOver = (e: DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) e.preventDefault();
  };
  const onDragEnter = (e: DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    dragDepth.current += 1;
    setDragging(true);
  };
  const onDragLeave = () => {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    loadFile(e.dataTransfer.files[0]);
  };

  const showHint = isImage && !imageName;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "stretch" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <button
          onClick={() => setPlaying((v) => !v)}
          disabled={!canPlay}
          title={canPlay ? undefined : "Image motion is still and auto push is off"}
          style={{ ...buttonStyle, opacity: canPlay ? 1 : 0.5, cursor: canPlay ? "pointer" : "default" }}
        >
          {animating ? "pause" : "play"}
        </button>
        <button onClick={() => fileRef.current?.click()} style={buttonStyle}>
          Choose image
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            loadFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {((isImage && imageName) || error) && (
          <span style={{ fontSize: 12, color: error ? "#e07a7a" : "#8a909e" }}>{error ?? imageName}</span>
        )}
      </div>

      <div
        ref={containerRef}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        style={{
          position: "relative",
          // Touch drags push the picture instead of scrolling the page.
          touchAction: isImage ? "none" : undefined,
          width: "100%",
          height,
          borderRadius: 8,
          outline: dragging ? "2px dashed #3d7cf2" : "2px dashed transparent",
          outlineOffset: 4,
        }}
      >
        {glError ? (
          <div style={{ fontSize: 13, color: "#e07a7a" }}>{glError}</div>
        ) : (
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`Dot grid rasterized from the ${p.source} source`}
            style={{ display: "block", width, height }}
          />
        )}
        {showHint && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                background: "#16181dE6",
                border: "1px solid #333",
                fontSize: 13,
                color: "#c4c8d2",
              }}
            >
              Drop an image or choose a file
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
