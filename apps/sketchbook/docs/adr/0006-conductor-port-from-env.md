# 0006. `SKETCHBOOK_PORT` drives the dev port; Conductor passes only `--host`

Status: Accepted · 2026-09-09 · amended 2026-10-04 (monorepo)

## Context
Each local Conductor workspace needs a stable dev-server port that doesn't
collide with its siblings. Outside Conductor the variable is unset and Vite's
default of 5173 should apply. `playground/vite.config.ts` derived the port from
`CONDUCTOR_PORT` while the playground was the only dev server in the repo.

In the monorepo the portfolio dev server runs beside it and takes
`CONDUCTOR_PORT`. Conductor gives a local workspace ten ports, `CONDUCTOR_PORT`
through `CONDUCTOR_PORT+9`, so the playground takes the next one.

## Decision
`vite.config.ts` derives both `port` (falling back to 5173) and `strictPort`
(true only when the variable is set) from `SKETCHBOOK_PORT`. The root
`.conductor/settings.toml` sets `SKETCHBOOK_PORT=$((CONDUCTOR_PORT + 1))` and
passes `--host 127.0.0.1`, because Vite's `localhost` default can resolve to
`::1`.

## Consequences
- Do not add `--port` to the Conductor script. It overrides the config's fallback
  and fails with `option --port <port> value is missing` wherever the variable is
  unset, which breaks every non-Conductor checkout.
- Do not read `CONDUCTOR_PORT` in the config again. The portfolio dev server owns
  it, so both servers would try to bind the same port.
- `strictPort` makes a port clash fail loudly in Conductor instead of silently
  moving to another port.
