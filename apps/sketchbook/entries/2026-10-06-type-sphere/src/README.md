# Type sphere

A lit solid drawn in rows of words on a Canvas 2D. Each word is scaled by how
dark the solid is where it lands: big in shadow, tiny in the light.

## Files

- `index.tsx`: the React shell. It holds the dials, pointer input, the frame
  loop for the orbiting light and spin, and the drawing.
- `shading.ts`: the solids. A sphere in closed form, and a cube, tetrahedron
  and torus as signed distance fields, ray cast along -z. Lambert shading with
  ambient and contrast gives a darkness in [0,1]. Pure maths, no DOM.
- `layout.ts`: the row layout. It finds where each row crosses the silhouette,
  then places words left to right within each span, sizing each one by the
  darkness at its centre. Pure maths, no DOM; text measuring is passed in.

## Running it

It needs React and `dialkit` for the controls. Render the default export
anywhere; it draws its own cream paper panel.
