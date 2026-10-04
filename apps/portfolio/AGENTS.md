## Design tokens

The GTC token set (colour, spacing, type, motion, the interaction contract) lives in `packages/ui` as `@mlduke/ui`, an npm workspace of this repo. Edit tokens in place: change the JSON under `packages/ui/tokens/`, run `npm run build -w packages/ui`, and commit the regenerated `packages/ui/dist/tokens.css` with it. There is no release or tag to bump.

`app/globals.css` imports `@mlduke/ui/tokens.css`. Its `@theme` block, the `--text-*--font-weight-emphasized` aliases and the `.sandbox-theme` `--color-*` re-pointing are this app's Tailwind bridge, and they stay here, not in `packages/ui`.

The package also ships the IBM Plex woff2 files. `app/layout.tsx` loads them with `next/font/local` from the root `node_modules/@mlduke/ui/fonts/` (a symlink to `packages/ui/fonts/`), not through the package's `fonts.css`, which would load them twice. If a font file is added, removed or renamed in `packages/ui/fonts/`, update the `src` lists there.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
