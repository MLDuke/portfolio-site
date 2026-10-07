import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, DragEvent, PointerEvent } from "react";
import { useDialKitController } from "dialkit";
import { buildImageAtlas, buildRampAtlas, buildTextAtlas } from "./rasterize.ts";
import type { Atlas } from "./atlas.ts";
import { createSphereRenderer } from "./renderer.ts";
import type { SphereRenderer } from "./renderer.ts";
import { easeLight, lightFromAngles, lightSettled, pointerToLight, sphereRadiusPx } from "./sphere.ts";
import type { Vec3 } from "./sphere.ts";

// Word sphere: an analytically lit sphere, rasterized into rows of words. Each
// cell holds one mark (a string of text or a dropped-in image) whose size
// follows the shading, after the 1970 Pirelli "Industria Mondiale" poster.
//
//   sphere + light -> shade(cell centre) -> ink = 1 - shade -> mark size / glyph
//   render (scale | ramp)                -> one mark scaled by ink, or one
//                                           character of a ramp picked by ink
//
// The pointer is the light: hover the canvas and the light moves to the point of
// the sphere under it, then eases back to the dialled direction on leave.
//
// This file is the React shell: dials, buttons, image loading, the light and
// the frame loop. atlas.ts builds the mark bitmap and sphere.ts holds the maths
// (both testable without a browser); renderer.ts owns WebGL and the shader.
//
// Colours are literals rather than the playground's CSS variables so the
// sketch survives being lifted out of this repo. They assume the dark stage.

const STAGE_HEIGHT_MIN = 240;
const LIGHT_EASE = 7; // 1/s: how fast the light chases the pointer, or home

const buttonStyle: CSSProperties = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid #333",
  background: "#1e2027",
  color: "inherit",
  cursor: "pointer",
};

export default function WordSphere() {
  // The controller (not plain useDialKit) so loading an image can flip the
  // `mark` select from code.
  const { values: p, setValue } = useDialKitController("Word sphere", {
    mark: { type: "select", options: ["text", "image"], default: "text" },
    text: { type: "text", default: "MLDUKE", placeholder: "A word, or characters for ramp" },
    // scale draws the whole mark smaller where it's lit; ramp draws one
    // character per cell, picked from the text by how much ink it has.
    render: { type: "select", options: ["scale", "ramp"], default: "scale" },
    ink: { type: "color", default: "#141414" },
    paper: { type: "color", default: "#ece8de" },
    paperOn: true,
    sphere: {
      radius: [0.46, 0.15, 0.5, 0.01], // of min(width, height); shrinks to keep marks on the canvas
      azimuth: [45, -180, 180, 1], // 0 at the viewer, 90 from the right
      elevation: [12, -90, 90, 1],
      spin: [0, -3, 3, 0.05], // rad/s the light circles; 0 holds still
    },
    light: {
      ambient: [0.08, 0, 1, 0.01],
      diffuse: [0.95, 0, 2, 0.01],
      specular: [0, 0, 1, 0.01],
      shininess: [32, 1, 128, 1],
      rim: [0, 0, 1, 0.01],
    },
    grid: {
      rowHeight: [13, 4, 40, 1],
      fill: [0.8, 0.2, 1, 0.01], // mark height as a share of the row
      cellWidth: [1, 0.5, 2, 0.01], // 1 packs marks edge to edge
      stagger: [0, 0, 1, 0.01], // fixed grid only: odd rows shift by this much of a cell
      pack: true, // words end to end, each as wide as it is drawn, like the poster
      alignLeft: true, // rows start on the circle's edge, as on the poster
      height: [620, STAGE_HEIGHT_MIN, 900, 10],
    },
    tone: {
      invert: true, // ink where it's dark
      gamma: [1, 0.2, 3, 0.01],
      contrast: [1, 0.2, 3, 0.05],
      minScale: [0.3, 0.05, 1, 0.01],
      cutoff: [0, 0, 1, 0.01], // cells with less ink than this draw nothing
    },
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const rendererRef = useRef<SphereRenderer | null>(null);
  const timeRef = useRef(0);
  const dragDepth = useRef(0);
  const loadToken = useRef(0);
  const pointer = useRef<{ x: number; y: number } | null>(null); // canvas px; null when away
  const lightRef = useRef<Vec3>(lightFromAngles(p.sphere.azimuth, p.sphere.elevation));
  const loop = useRef<{ raf: number; last: number | null }>({ raf: 0, last: null });

  const [width, setWidth] = useState(0);
  const [playing, setPlaying] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [imageAtlas, setImageAtlas] = useState<Atlas | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [glError, setGlError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const height = Math.max(STAGE_HEIGHT_MIN, Math.round(p.grid.height));
  const isImage = p.mark === "image";
  const canPlay = p.sphere.spin !== 0;
  const animating = playing && canPlay;

  // The mark atlas: an image's, once one is loaded, or the text built the way
  // the render mode needs it. An image has no characters to rank, so `ramp`
  // falls back to `scale` for it without any special case.
  const textAtlas = useMemo(() => {
    if (isImage) return null;
    try {
      return p.render === "ramp" ? buildRampAtlas(p.text) : buildTextAtlas(p.text);
    } catch {
      return null;
    }
  }, [isImage, p.render, p.text]);
  const atlas = isImage ? imageAtlas : textAtlas;

  // Always-current snapshot for the rAF loop, which must not re-subscribe on
  // every dial tick.
  const aspect = atlas?.aspect ?? 1;
  const state = useRef({ p, width, height, animating, aspect });
  state.current = { p, width, height, animating, aspect };

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
    const renderer = createSphereRenderer(canvas, {
      onError: setGlError,
      onRestore: () => drawRef.current(),
    });
    rendererRef.current = renderer;
    return () => {
      loadToken.current += 1; // a decode still in flight is now stale
      renderer?.destroy();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    rendererRef.current?.setAtlas(atlas);
  }, [atlas]);

  // Where the light wants to be: under the pointer while it hovers, otherwise
  // the dialled direction, turned by `spin` over the play clock.
  const targetLight = (): Vec3 => {
    const { p, width: w, height: h, aspect } = state.current;
    const ptr = pointer.current;
    if (ptr) {
      const { rowHeight, fill } = p.grid;
      return pointerToLight(ptr.x, ptr.y, w / 2, h / 2, sphereRadiusPx(p.sphere.radius, w, h, Math.max(2, rowHeight), fill, aspect));
    }
    const turn = (p.sphere.spin * timeRef.current * 180) / Math.PI;
    return lightFromAngles(p.sphere.azimuth + turn, p.sphere.elevation);
  };

  const draw = () => {
    const { p, width: w, height: h } = state.current;
    rendererRef.current?.render({ ...p, width: w, height: h }, lightRef.current);
  };
  const drawRef = useRef(draw);
  drawRef.current = draw;

  // One frame loop for two clocks. Time advances only while animating, so
  // pausing freezes the spin and the first frame is always t = 0. The light
  // eases toward its target whenever it hasn't arrived, paused or not, since the
  // pointer sent it. The loop stops itself once neither needs it.
  const tick = (now: number) => {
    const l = loop.current;
    const dt = l.last === null ? 0 : Math.min(0.1, (now - l.last) / 1000);
    l.last = now;
    if (state.current.animating) timeRef.current += dt;
    const target = targetLight();
    lightRef.current = easeLight(lightRef.current, target, dt, LIGHT_EASE);
    const easing = !lightSettled(lightRef.current, target);
    if (!easing) lightRef.current = target;
    drawRef.current();
    if (state.current.animating || easing) {
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
  // mark) instead. A dial change moves the light at once; only the pointer's
  // coming and going is eased.
  useEffect(() => {
    if (loop.current.raf) return;
    if (!pointer.current) lightRef.current = targetLight();
    drawRef.current();
  });

  // Hover is the light: the pointer's place on the canvas picks the direction.
  const onPointerMove = (e: PointerEvent) => {
    const box = e.currentTarget.getBoundingClientRect();
    pointer.current = { x: e.clientX - box.left, y: e.clientY - box.top };
    startLoop();
  };
  const onPointerLeave = () => {
    pointer.current = null;
    startLoop();
  };

  // Latest load wins: one that resolves after a newer load started (or after
  // unmount) is dropped, and its bitmap closed. Held in memory only: decoded,
  // reduced to a mask and uploaded to the GPU, never stored.
  async function loadImage(file: Blob, name: string) {
    const token = ++loadToken.current;
    try {
      if (!file.type.startsWith("image/")) {
        setError("That file isn't an image");
        return;
      }
      const bitmap = await createImageBitmap(file);
      const made = token === loadToken.current ? buildImageAtlas(bitmap) : null;
      bitmap.close();
      if (token !== loadToken.current) return;
      if (!made) {
        setError("That image has no marks to draw");
        return;
      }
      setImageAtlas(made);
      setImageName(name);
      setError(null);
      setValue("mark", "image");
    } catch {
      if (token === loadToken.current) setError("Couldn't read that image");
    }
  }

  const loadFile = (file: File | undefined) => {
    if (file) void loadImage(file, file.name);
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

  const showHint = isImage && !imageAtlas;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "stretch" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <button
          onClick={() => setPlaying((v) => !v)}
          disabled={!canPlay}
          title={canPlay ? undefined : "Spin is 0, so there is nothing to play"}
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
            aria-label={
              isImage ? "A sphere built from rows of an image" : `A sphere built from rows of the text ${p.text}`
            }
            style={{ display: "block", width, height, borderRadius: 8 }}
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
