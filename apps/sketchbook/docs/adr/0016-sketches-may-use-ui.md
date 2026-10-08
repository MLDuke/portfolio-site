# 0016. Sketches may use `@mlduke/ui`, and the stage no longer hides it

Status: Accepted · 2026-10-07

## Context
The house style told sketches to use inline styles with literal values and never
the playground's CSS variables, so a sketch would survive being lifted out of the
repo. `playground/src/stage-isolation.ts` enforced that: it read every custom
property `@mlduke/ui` declares and set each to `initial` inside `.canvas`, so
`var(--surface-raised)` was invalid there. Sketchbook is now a subsite of the
portfolio design system, and
[root 0001](../../../../docs/adr/0001-controls-live-in-ui.md) puts shared controls
in `@mlduke/ui`. A control rendered in the stage would have been unstyled.

## Decision
Sketches may read `@mlduke/ui` tokens and use its controls, and may still use
literal values and inline styles. Neither is required. `stage-isolation.ts` and
its import are gone, so the tokens `main.tsx` loads reach the stage.

The stage is otherwise unchanged. `.canvas` keeps its literal background,
padding, border and font, so a sketch that uses neither tokens nor controls
renders exactly as before, and the stage promises in
[AGENTS.md](../../AGENTS.md#the-sketch-contract) still hold.

This supersedes the literal-values rule in the house style, and amends
[0014](0014-sketch-internals-stay-in-entry.md): sketch internals still stay in
the entry until a second sketch needs them, but controls are the exception. They
are built once, in `@mlduke/ui`, and not copied from entry to entry.

## Consequences
- `playground/index.html` sets `data-theme="dark"` on `<html>`, so tokens inside
  the stage resolve to their dark values. A sketch that wants the other theme puts
  `data-theme="light"` on one of its own elements, which opens a scope for
  everything inside it.
- A sketch that uses tokens or controls needs `@mlduke/ui` beside it, so it can no
  longer be copied out as a single file. That cost is accepted.
  [0014](0014-sketch-internals-stay-in-entry.md)'s reasoning about self-contained
  entries now applies only to what is not in `ui`.
- A token name that doesn't exist still resolves to the guaranteed-invalid value,
  as `var(--x)` always does. Give `var()` a fallback if the value matters.
- Nothing about `dialkit` changes here. A `useDialKit` panel's label must still
  equal the entry title.
