## Agent skills

### Issue tracker

Issues and specs for this repo live in Linear (team `Mduke`, label `portfolio-site`) and use the Linear MCP tools. See `docs/agents/issue-tracker.md`.

### Domain docs

This is a single-context repo: read `CONTEXT.md` at the repo root and relevant ADRs under `docs/adr/` when they exist. See `docs/agents/domain.md`.

## Design tokens

The GTC token set (colour, spacing, type, motion, the interaction contract) lives in the public [`MLDuke/ui`](https://github.com/MLDuke/ui) repo as `@mlduke/ui`, a git-tag dependency. `app/globals.css` imports `@mlduke/ui/tokens.css`. Its `@theme` block, the `--text-*--font-weight-emphasized` aliases and the `.sandbox-theme` `--color-*` re-pointing are this repo's Tailwind bridge, and they stay here. To change a token, edit it in `MLDuke/ui`, tag a release, then bump the tag in `package.json`.

The package also ships the IBM Plex woff2 files. `app/layout.tsx` loads them with `next/font/local` from `node_modules/@mlduke/ui/fonts/`, not through the package's `fonts.css`, which would load them twice. If a tag bump adds, removes or renames a font file, update the `src` lists there.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
