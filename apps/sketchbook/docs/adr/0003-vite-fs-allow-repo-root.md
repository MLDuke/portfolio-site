# 0003. Vite serves from the workspace root (`server.fs.allow`)

Status: Accepted · 2026-09-03 · revised 2026-10-05 (monorepo, MDU-24)

## Context
The playground's Vite root is `playground/`, but it reads `../entries` (notes,
media, sketch source) and `../scripts/lib/entry.mjs`. It also imports
`@mlduke/ui/fonts.css`, whose IBM Plex `.woff2` files live in `packages/ui/fonts/`,
outside `apps/sketchbook`. Vite refuses to serve files outside its root by
default, and setting `server.fs.allow` replaces its default workspace-root list
rather than adding to it.

## Decision
`playground/vite.config.ts` sets
`server.fs.allow: [searchForWorkspaceRoot(process.cwd())]`: the monorepo root,
which covers `apps/sketchbook/entries`, `apps/sketchbook/scripts/lib` and
`packages/ui`. It is not `apps/sketchbook`, the parent of `playground/`, which
is what `..` resolves to and what the config used before the monorepo. That path
is still used for `loadEnv`, because `.env` lives in `apps/sketchbook`.

## Consequences
- Remove it and every sketch returns 403 in dev. The failure looks like a broken
  sketch, not a broken config.
- Narrow it to `apps/sketchbook` and the Plex fonts return 403 in dev. The page
  silently falls back to system-ui, and production builds still pass, so nothing
  fails loudly. CI starts the dev server and requests a font to catch this.
- The playground and the sketches can't be separated into different roots without
  revisiting this and [0002](0002-three-vite-globs.md).
