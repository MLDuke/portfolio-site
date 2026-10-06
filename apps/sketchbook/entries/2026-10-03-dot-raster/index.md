---
title: "Dot raster"
# description: 1-2 sentences. Feeds the journal card and the page meta/OG
# tags, so write it for someone who hasn't opened the entry yet.
description: "A dense grid of dots rasterizing a scalar field: swooping bands, ripples, wave interference, or a dropped-in image. Active dots swell and turn blue, either by threshold or continuously like a halftone."
date: "2026-10-03"
slug: "dot-raster"
type: code
publish: true
# media: one item per image/GIF. src is relative to this entry folder;
# alt is required once src is set.
media:
  - src: "dot-raster.gif"
    alt: "A grid of small grey dots on a dark background, where swollen blue dots form wide diagonal bands that sweep and curve across the grid"
sourcePath: "src/"  # path to the source file(s), relative to this entry folder
---

Inspired by a 1970s Japanese book cover: a flat field of small grey dots where
the "on" ones grow and go blue, forming big diagonal swooshes.

Each frame, a source (`band`, `ripple`, `interference`, or a loaded `image`)
fills one value in [0,1] per grid cell, and a render mode turns that value into a
dot. `binary` is the cover look, with a threshold between small grey and large
blue. `halftone` blends radius and colour continuously. The whole pipeline runs in one WebGL2
fragment shader: each pixel finds its dot cell and draws an antialiased circle, so
the cost doesn't grow with the number of dots.

The image source starts on an example photo (a pair of eyes); drop your own on
the grid, or use "Choose image". It is read into memory and sampled one pixel per
cell, and nothing is saved. Light pixels are inverted to small grey dots by
default, so the dark features carry the blue.

The picture moves by moving where each dot samples it, never the dots
themselves. `motion` drifts the sample points over time: `wave` slides each row
sideways, `flow` churns the whole picture. The pointer pushes pixels too: hover
over the grid and the picture under it is dragged along, and springs pull it back
home, with `damping` deciding how much it wobbles on the way. `shape` picks
what a push moves: `brush` drags a soft round patch, while `rows` and `columns`
slide whole strips of the picture edge to edge, `strip` dots thick, like a
sliding puzzle with hard seams. `random` hops between the three, holding each
for a seeded stretch between `holdMin` and `holdMax` seconds, so the same reload
replays the same sequence. With `auto` on,
`agitators` do the same unattended: seeded wanderers that roam the picture at
`pace` and keep stirring it while it plays. The animation starts paused if the
system asks for reduced motion; the pointer push still answers the pointer.

Turn on `multiPanel` to split the canvas into a grid of miniature copies of the
whole composition. Each panel runs the same simulation but lags the one after it
by `lag` frames (1/60 s each), with the bottom-right panel live. Together they
read as a staggered sequence. Sources are analytic in time, so a panel just
evaluates the field at an earlier time and no frame history is kept. The push is
the exception: it is state, so every panel shows the live push.
