# AGENTS.md

MLDuke's portfolio site, the lab notebook it publishes from, and the design tokens both consume. One repo, three npm workspaces, one lockfile.

## Map

| Path | What it is |
|---|---|
| `apps/portfolio` | The Next.js site. Its `/journal` section is built from Sketchbook entries. |
| `apps/sketchbook` | Lab notebook of design and code sketches: `entries/`, plus a local Vite playground that renders them. |
| `packages/ui` | `@mlduke/ui`: GTC design tokens and the IBM Plex fonts. Both apps consume it as a workspace. |
| `.conductor/`, `scripts/` | Conductor settings, and the setup and agentation scripts they call. |
| `docs/adr/` | Decisions that span apps. Sketchbook keeps its own in `apps/sketchbook/docs/adr/`. |
| `docs/agents/` | How agent skills use the issue tracker and domain docs. |

Each of these has its own `AGENTS.md` or `README.md` with rules for working inside it. Read it before you change anything there.

## Commands

Run from the repo root. Install once at the root with `npm ci`. Never run `npm install` inside a workspace: the lockfile is shared.

| | |
|---|---|
| `npm run dev:portfolio` | portfolio dev server |
| `npm run dev:sketchbook` | playground dev server |
| `npm run build:portfolio` | portfolio production build |
| `npm run build:sketchbook` | static playground build |
| `npm test` | unit tests in all three workspaces |
| `npm run <script> -w apps/<app>` | any script in one workspace: `lint`, `test:e2e` (portfolio); `validate`, `typecheck`, `new` (sketchbook) |
| `npm run build -w packages/ui` | regenerate `packages/ui/dist/tokens.css` |

## Where changes go

- **A colour, spacing, type, motion or interaction value:** `packages/ui/tokens/`, then rebuild. See `packages/ui/README.md`.
- **How a token reaches Tailwind** (`@theme`, aliases, `.sandbox-theme`): `apps/portfolio/app/globals.css`.
- **A page, component or site data:** `apps/portfolio/app/`.
- **A sketch:** `apps/sketchbook/entries/`, scaffolded with `npm run new`. Follow `apps/sketchbook/AGENTS.md`, whose first rule is never to set `publish: true`.
- **The playground or entry scripts:** `apps/sketchbook/playground/` and `apps/sketchbook/scripts/`. Read the matching ADR in `apps/sketchbook/docs/adr/` first.
- **Conductor setup, run buttons or archive:** `.conductor/settings.toml` and `scripts/`.

`packages/ui` stays consumer-neutral: nothing in it names a selector, class or path from one app.

## Conductor ports

A local workspace gets ten ports, `$CONDUCTOR_PORT` to `$CONDUCTOR_PORT+9`. The portfolio dev server takes `$CONDUCTOR_PORT`. The playground takes `$CONDUCTOR_PORT+1`, passed to Vite as `SKETCHBOOK_PORT`.

## Agent skills

### Issue tracker

Issues and specs for this repo live in Linear (team `Mduke`) and use the Linear MCP tools. Every issue gets the `portfolio-site` label, including Sketchbook and `ui` work. See `docs/agents/issue-tracker.md`.

### Domain docs

This is a multi-context repo. Sketchbook has a `CONTEXT.md` and ADRs under `apps/sketchbook/`. Portfolio and `ui` have none yet. See `docs/agents/domain.md`.
