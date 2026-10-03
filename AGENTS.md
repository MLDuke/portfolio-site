## Agent skills

### Issue tracker

Issues and specs for this repo live in Linear (team `Mduke`, label `portfolio-site`) and use the Linear MCP tools. See `docs/agents/issue-tracker.md`.

### Domain docs

This is a single-context repo: read `CONTEXT.md` at the repo root and relevant ADRs under `docs/adr/` when they exist. See `docs/agents/domain.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
