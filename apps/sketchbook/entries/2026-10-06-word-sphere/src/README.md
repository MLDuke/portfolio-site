# Word sphere

A lit sphere drawn as rows of words, by one WebGL2 fragment shader. Each cell
holds a mark (a string of text, or a dropped-in image) and the sphere's shading
decides how big it is, or which character it is.

## Files

- `index.tsx`: the React shell. It holds the dials and buttons, image loading,
  the pointer-driven light and the frame loop.
- `renderer.ts`: the WebGL2 side. It holds the GLSL, context loss handling,
  drawing-buffer sizing, the atlas and layout textures, and uniform packing.
  `createSphereRenderer()` is its only entry point.
- `sphere.ts`: the sphere, the light, the grid and the packed row layout. Pure
  maths, no GL or DOM; the shader mirrors it. `sphereRadiusPx()` keeps the
  whole sphere, overhanging marks included, on the canvas.
- `atlas.ts`: the mark atlas type and the pure parts of building one (ramp
  ordering, cropping, packing, image masks). No GL or DOM.
- `rasterize.ts`: the 2D-canvas half of the atlas. It draws glyphs and reads
  image pixels, then hands the bytes to `atlas.ts`.

## Running it

It needs React, `dialkit` for the controls and a browser with WebGL2. Render the
default export on a dark background; the canvas paints its own paper. The
`Helvetica Neue` / `Arial Black` font stack is literal, so a machine without
either falls back to Arial.
