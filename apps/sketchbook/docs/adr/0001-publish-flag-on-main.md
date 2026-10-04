# 0001. Publishing is `publish: true` on main, and only the author flips it

Status: Accepted · 2026-08-31 · amended 2026-10-04 (monorepo)

## Context
This repo is the source of truth for every sketch, and it is public. Only some
entries belong on the portfolio site, and the rest are drafts that stay
private-by-convention.

## Decision
Publishing is a one-line frontmatter edit, `publish: true`, plus a push to
`main`. The push rebuilds the portfolio directly, and `apps/portfolio` builds
the flagged entries into `/journal` from `apps/sketchbook/entries` in the same
checkout. There is no separate release step, publish branch or post-merge hook. The
author decides when to flip it. An agent never does, and `AGENTS.md` forbids it.
The pipeline itself is described in [README.md](../../README.md#workflow).

## Consequences
- Publishing is the only outward-facing action in the repo, and the one that is
  hard to take back. The flag is a one-line edit that could plausibly be made
  while tidying something else, which is why the rule is explicit rather than
  left to judgement.
- CI runs `validate` on every pull request. Do not remove that step: with no
  gate after the merge, it is what keeps a half-filled published entry from
  failing inside `portfolio-site`'s build.
- Deploying the playground is a separate matter and never publishes anything, but
  it exposes every draft. See the *Publishing* section of the
  [guide](../authoring-sketches.md#publishing).
