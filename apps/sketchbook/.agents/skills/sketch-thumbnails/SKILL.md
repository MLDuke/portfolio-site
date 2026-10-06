---
name: sketch-thumbnails
description: Regenerate Sketchbook thumbnails before a commit. Use when committing a change under apps/sketchbook/entries/*/src, or when `npm run validate` warns that an entry has no thumbnail.png.
---

A thumbnail is `entries/<dir>/thumbnail.png`: a screenshot of a sketch's stage
that the playground index shows as the entry's card. It is never listed under
`media:` and never published. Why: `apps/sketchbook/docs/adr/0015-thumbnail-outside-media.md`.

Run the commands from the repo root.

## 1. Pick the entries

Shoot an entry only when its sketch changed in this commit, or when it has no
thumbnail yet. An animated sketch renders different pixels on every run, so
reshooting an unchanged one commits a new binary for nothing.

```sh
# sketches with uncommitted changes
git status --porcelain -- apps/sketchbook/entries | sed -nE 's#.*apps/sketchbook/entries/([^/]+)/src/.*#\1#p' | sort -u
# entries with no thumbnail
npm run validate -w apps/sketchbook 2>&1 | sed -nE 's#.*entries/([^/:]+): no thumbnail\.png.*#\1#p'
```

Take the union of the two lists, minus any folder that no longer exists. Done
when you hold that list. If it's empty, stop: there is nothing to shoot.

## 2. Shoot them

```sh
npm run thumbnails -w apps/sketchbook -- <dir> [<dir>…]
```

Done when every dir prints its `thumbnail.png` path and the command exits 0.
On a failure line:

- **Chromium isn't installed**: run `npx playwright install chromium` once, then
  retry.
- **the sketch threw**, or a timeout waiting for `.canvas`: the sketch is broken.
  Fix it, or report it to the user and leave that entry's old thumbnail in place.
  A thumbnail is only taken from a sketch that renders.

## 3. Look at each one

Read every new `thumbnail.png`. Done when each one shows the sketch in a
representative state: drawn, settled, recognisably what the entry is about. A
blank stage or a half-played intro animation means it was shot too early.
Reshoot that entry with a longer settle time (`--wait 3000`, in milliseconds)
until it looks right.

## 4. Commit them with the sketch

Stage each `apps/sketchbook/entries/<dir>/thumbnail.png` in the same commit as
the sketch change it shows.
