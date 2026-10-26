# 0018. Share links open one entry from a separate share build

Status: Accepted · 2026-10-26

## Context
The deployed playground is behind one password ([0017](0017-password-gate-in-routing-middleware.md)).
Sometimes one entry needs to go to someone who shouldn't get the password or
see anything else (MDU-74).

Letting one route through the gate isn't enough, because the playground's
bundle can't be split by entry. The note and media globs are eager
([0002](0002-three-vite-globs.md)), so every entry's note is in the main chunk.
Every sketch chunk imports that chunk, and the route is a URL fragment the
server never sees.

## Decision
- **A second build.** `build:playground` runs `vite build --mode share` after
  the playground build. `playground/share-pages.ts` generates one module per
  entry that imports only that entry's note, media and sketch, and writes
  `dist/s/<dir>/index.html` to load it. Shared chunks (React, the shell, the
  styles) hold no entry. `share.tsx` renders the entry with the playground's
  own `Stage`, without the back link and the problems.
- **A signed token.** A share link is `/s/<dir>/?t=<expiry>.<signature>`. It is
  an HMAC of the folder name and expiry under `SKETCHBOOK_SHARE_SECRET`, a
  third secret, and lasts 180 days.
- **The gate decides.** `isPublic()` in `gate/gate.js` lets through a share
  page whose token is valid for that entry, plus everything under `/s/assets/`
  and each entry's `/s/<dir>/og.<ext>`. A share page with a bad or expired token
  gets a page that says so, not the login form.
- **Links come from the gate.** Signed in, `POST /share` with `dir` returns the
  link and its expiry. The stage's "Copy share link" button calls it, so the
  secret never leaves Vercel. Sensitive variables can't be pulled to a machine
  anyway.
- **Revocation is all-or-nothing.** Rotating `SKETCHBOOK_SHARE_SECRET` voids
  every link and signs no one out. There is no per-link revocation, because
  that would need a store.
- **Links unfurl.** Each share page has `og:` tags, and its image is the
  thumbnail, or the first media file, copied to a fixed name. `noindex` stays.

## Consequences
- `/s/assets/` is public. Its files are hashed, each holds at most one entry,
  and only that entry's share page names them. They aren't listed anywhere.
  The repo is public, so this exposes nothing that isn't already on GitHub.
  The playground's own `/assets/` stays behind the password.
- Don't import `sketches.ts` (the globs) from anything `share.tsx` reaches.
  Doing so puts every entry back into every share page. `sketch.ts` holds the
  glob-free part both builds share.
- Every entry gets a share page, drafts included: sharing a draft is the point.
- A share page is a snapshot of `main` at the last sketchbook deploy. The link
  stays valid when the entry changes, and shows the new version.
- Renaming an entry folder breaks its links. The token signs the folder name.
- Rotating the share secret, like any env change, takes effect on the next
  build. The `ignoreCommand` in `vercel.json` cancels a plain redeploy of an
  unchanged commit.
- The share build and the gate both know the `/s/` layout: `share-pages.ts`
  writes it, and the patterns at the top of `gate.js` read it. Change them
  together.
- `og:image` URLs are absolute only on Vercel, which sets
  `VERCEL_PROJECT_PRODUCTION_URL` at build time. A local build writes relative
  ones.
