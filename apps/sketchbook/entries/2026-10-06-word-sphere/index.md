---
title: "Word sphere"
# description: 1-2 sentences. Feeds the journal card and the page meta/OG
# tags, so write it for someone who hasn't opened the entry yet.
description: "A sphere lit from one side and built from rows of words, after a 1970 Pirelli poster: heavy type in the shadow, smaller words toward the light. Hover to move the light, or drop in an image to use as the mark."
date: "2026-10-06"
slug: "word-sphere"
type: code
publish: true
# media: one item per image/GIF. src is relative to this entry folder;
# alt is required once src is set. To fill it in, drop the [] below and
# uncomment the example under it:
media: []
#   - src: "scroll-snap.gif"
#     alt: "Scroll snap prototype moving between image panels"
sourcePath: "src/"  # path to the source file(s), relative to this entry folder
---

Inspired by the 1970 Pirelli "Industria Mondiale" poster: a sphere built from
rows of the PIRELLI logotype, black ink on cream paper. The words are big and
heavy on the shadowed left, shrink toward the lit right so that side reads
lighter, and the sphere's left edge follows the circle. The poster cuts its
sphere off with a flat vertical edge on the right; this sketch doesn't, and
shows the whole ball.

The sphere is analytic: a ray-sphere hit in the fragment shader, with a normal,
Lambert diffuse and ambient, and optional Blinn-Phong specular and rim. Rows of
fixed height are laid across it, and each cell shades the sphere once, at its
centre, so a cell is one value. That value becomes ink (the poster inks the
shadow, so `invert` is on), shaped by `gamma` and `contrast`, and ink decides
the mark. The whole pipeline runs in one WebGL2 fragment shader: each pixel
finds its cell and draws from the mark atlas, so the cost doesn't grow with the
number of words.

`scale` is the poster. The whole mark is drawn smaller as the ink falls, from
full size down to `minScale`, anchored at its left-centre, and cells with less
ink than `cutoff` draw nothing. `ramp` is for text only: one character per
cell, picked from the text by how much ink each character has. The sketch
measures every character's coverage on a canvas and sorts them lightest first,
so `.:-=+*#%@` works as typed and so does any other string. An image mark has no
characters to rank, so `ramp` falls back to `scale` for it.

The poster's words sit end to end: a word that shrinks pulls the next one in, so
the lit side stays dense with small words. A pixel can't find a word by
division when its position depends on every width before it, so with `pack` on
(the default) the rows are laid out per row in JS, a few thousand shades, and
uploaded as a texture the shader binary-searches. Turn `pack` off for a fixed
grid, where every cell is a full-size word wide and small words sit in its
left corner with gaps, and `stagger` offsets alternate rows. `alignLeft` starts
each row on the circle's edge, as the poster does, instead of the bounding box.

The whole sphere stays on the canvas. A cell belongs to the sphere when its
left edge is inside the circle, so marks overhang the right-hand rim by up to a
word; `radius` is a share of the shorter side, pulled in just enough to leave
room for that overhang, and it only bites on a narrow stage.

The light is the pointer. Hover the canvas and the light moves to the point of
the sphere under it, then eases back to the `azimuth` and `elevation` dials when
the pointer leaves. `spin` turns the light around the sphere in rad/s while
playing; it starts at 0, so the poster holds still, and the animation starts
paused if the system asks for reduced motion (hovering still moves the light).

The mark is `text` (typed as is, in a heavy sans) or an image: drop one on the
canvas or use "Choose image". An image with real transparency is its own shape,
so its alpha is the mark. An opaque one has none, so its darkness is: dark
pixels become ink and light ones paper. Either way the mark is cropped to its
ink, shrunk to 512 px, read into memory and sampled with mipmaps, so marks
drawn small are averaged rather than aliased. Nothing is saved. `ink` and
`paper` are the two colours; turn `paperOn` off to leave the canvas transparent
and let the ink sit on the dark stage, where you will want a lighter `ink`.
