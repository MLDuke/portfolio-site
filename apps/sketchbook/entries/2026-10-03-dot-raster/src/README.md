# Dot raster

A grid of dots drawn by one WebGL2 fragment shader. A source gives every dot
cell a value in [0,1], and a render mode turns that value into a radius and a
colour.

## Files

- `index.tsx`: the React shell. It holds the dials and buttons, image loading,
  pointer input and the frame loop.
- `renderer.ts`: the WebGL2 side. It holds the GLSL, context loss handling,
  drawing-buffer sizing, the image and push textures, and uniform packing.
  `createDotRenderer()` is its only entry point.
- `layout.ts`: panel layout for `multiPanel`. Pure maths, no GL or DOM.
- `push.ts`: the push fields. The brush and strip springs and the seeded
  agitators. Pure maths, no GL or DOM.

## Running it

It needs React, `dialkit` for the controls, a bundler that can import the
example photo (`example.png`, not shown here) and a browser with WebGL2. Render
the default export on a dark background; the colours assume one.
