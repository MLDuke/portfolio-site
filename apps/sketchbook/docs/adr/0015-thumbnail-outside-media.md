# 0015. Thumbnails are a generated `thumbnail.png`, outside `media:`

Status: Accepted · 2026-10-05

## Context
The playground index is a grid of cards. An `image` entry's card shows its first
media item, but a `code` entry has no media, so its card was a blank "CODE"
placeholder. Rendering every sketch live on the index would undo the lazy sketch
glob ([0002](0002-three-vite-globs.md)), run every animation loop at once, and
hit the browser's cap on WebGL contexts. A screenshot costs nothing at runtime.

The screenshot can't go under `media:`. `portfolio-site` turns every media item
into a figure in the published post, and the first into the journal card, so a
thumbnail listed there would be published alongside the entry.

## Decision
- A thumbnail is the file `thumbnail.png` beside `index.md`, never listed under
  `media:`. The name is `THUMBNAIL_FILE` in `scripts/lib/entry.mjs`, which reads
  it into `entry.thumbnail`, so neither adapter knows the name.
- `npm run thumbnails` (`scripts/thumbnails.mjs`) makes it. It starts the
  playground's own Vite server with both dev overlays defined off, opens each
  sketch in a headless Chromium (Playwright, a dev dependency), waits, and
  screenshots the stage (`.canvas`).
- It runs locally, at commit time, for entries whose sketch changed. Agents do
  this through the `sketch-thumbnails` skill (`.agents/skills/`). Nothing in CI
  or a deploy runs it.
- `validate` warns, without failing, when a `code` or `mixed` entry with a sketch
  has no thumbnail.
- The index prefers the thumbnail, then the first media item.

## Consequences
- `thumbnail.png` is a reserved name. Weight and extension checks apply to it as
  to any image beside `index.md`.
- A thumbnail can go stale: nothing compares it with the sketch. Regenerating at
  commit time is the only guard, and the skill is what makes that routine.
- An animated sketch never renders the same pixels twice, so regenerating an
  unchanged sketch commits a different PNG. Regenerate only what changed.
- Running it needs Playwright's Chromium installed once
  (`npx playwright install chromium`). CI doesn't, because nothing there runs it.
- The published journal is unaffected. A `code` entry still publishes with no
  card image unless its author lists media.
