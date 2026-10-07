---
title: "Type sphere"
# description: 1-2 sentences. Feeds the journal card and the page meta/OG
# tags, so write it for someone who hasn't opened the entry yet.
description: "A ball made of one word set in rows, after a 1970 Pirelli poster: words swell into the shadow and shrink to specks in the light. The light orbits on its own or follows the pointer, and the ball can be a cube, a tetrahedron or a donut."
date: "2026-10-06"
slug: "type-sphere"
type: code
publish: false
# media: one item per image/GIF. src is relative to this entry folder;
# alt is required once src is set. To fill it in, drop the [] below and
# uncomment the example under it:
media: []
#   - src: "scroll-snap.gif"
#     alt: "Scroll snap prototype moving between image panels"
sourcePath: "src/"  # path to the source file(s), relative to this entry folder
---

Inspired by a 1970 Pirelli poster, "Industria mondiale": a circle packed with
rows of the word PIRELLI, huge and heavy down the dark left side and dwindling
to tiny marks towards the right, so the type alone reads as a lit ball.

The shading is analytic. For any point on the disc, `shadeSphere` builds the
surface normal of a sphere, takes its dot product with the light direction
(Lambert), adds an `ambient` floor and bends the result with `contrast` to get a
darkness in [0,1]. There is no image anywhere. Rows then go down at a constant
`rowPitch`, each one a chord of the circle, and every row is laid out word by
word from its left limb to its right. A word's scale is a straight line from
`minScale` in full light to `maxScale` in full shadow, read at the word's own
centre: size it where it starts, step to where its centre would land, size it
again. `minScale` is a floor, so the lit side still has tiny words rather than
gaps. The last word on each row is clipped to its row's edge, which is how the
poster's rows run off the edge too.

The `shape` dial swaps the ball. The sphere keeps its closed form; the cube, the
tetrahedron (`triangle`, a vertex towards you so it reads as a triangle of three
faces) and the donut are signed distance fields, and each word's darkness comes
from an orthographic ray cast straight back from that point, marched to the
surface, with the normal taken from the field's gradient and the same Lambert,
`ambient` and `contrast` after it. Each is turned so it shows more than one
face, and scaled so the sphere that holds each one is the ball's size, so
`radius` still sizes them all and none can leave the canvas however it is turned. They are flat shaded, so a face is one size of word and the faces step
rather than ramp, with ragged edges where they meet. `thickness` is the donut's
tube radius over its major radius.

With no circle to take chords of, each row's centre line is scanned for the runs
where the ray lands on the shape, which are the row's spans. A cube or
tetrahedron row has one, a donut row through the hole has two, and the words are
laid out within each span exactly as before, the cycle carrying on across the
hole. A span is clipped to a rectangle one row tall. Spans depend on the shape,
its turn and its size but not the light, so they're worked out once and reused
while the light moves; a frame then costs only the words.

The `rotation` folder turns the cube, tetrahedron and donut (the sphere has
nothing to turn) on top of the tilt each starts with, about the screen's axes:
`x` tips it, `y` swings it round the vertical, `z` rolls it. They are offsets,
so every shape is at zero when it opens, rather than absolute angles, which
would mean a different number for each shape's good pose. `spin` swings the
shape round the vertical at `spinSpeed` degrees a second, with a small nod about
the horizontal so it never repeats a pose, and works with either light. A spin
changes the silhouette every frame, so the spans are rescanned each time: in
steps of a few pixels, with each edge then bisected, which keeps it to a few
milliseconds.

The `text` dial is split on whitespace and cycled along each row, so a single
word reproduces the poster, and several make something closer to a paragraph.
Each row starts one word further on than the one above it. A running count
down the whole sphere would reshuffle every row below whenever the light moved
and a word dropped out of one above, so each row works from its own number
instead. Words are measured once at a fixed size and cached, then drawn by
scaling the canvas transform rather than changing the font, which keeps
thousands of words a frame cheap. It is Canvas 2D throughout.

The light orbits the shape slowly by itself, starting from the right like the
poster's. The `angle` dial is where it starts, and `orbitSpeed` is degrees per
second, so the ball waxes and wanes like a moon, including a stretch when the
light is behind it and almost every word swells. Nothing is random: a frame
depends only on the dials and how far the orbit has gone. The animation starts
paused if the system asks for reduced motion, and the same static frame is what
you get when you press pause.

Set `light.source` to `pointer` and the light follows the mouse instead: its x
and y are the pointer's offset from the middle of the shape in radii, and its
distance in front of the screen is the light's `height` dial, so a low one rakes
the light across the surface and a high one lights it nearly head on. When the
pointer leaves, the light holds where it was. It works under reduced motion,
since you're the one moving it, and it redraws on pointer moves rather than
needing the loop, which only runs for a spin. `angle`, `orbitSpeed` and
`elevation` are for the orbit and are ignored. The pause button greys out when
neither the light nor a spin is moving by itself, and pauses both together.
