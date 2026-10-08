# 0001. Control components live in `@mlduke/ui`, and sketches may use them

Status: Accepted · 2026-10-07

## Context
Sketchbook is a subsite of the portfolio's design system, not a separate product.
The repo treated it as one anyway: the sketch contract asked for inline styles
with literal values, and the playground unset every `@mlduke/ui` custom property
inside the stage to enforce it. Meanwhile the controls a sketch needs (buttons,
sliders, toggles, a panel to hold them) are the same ones the site needs, and
each sketch rebuilds them. Dot raster carries its own `buttonStyle`, and
`dialkit` supplies the panel only as a dev overlay that never ships.

## Decision
- Control components live in `packages/ui`, next to the tokens, and are exported
  from `@mlduke/ui`.
- React is a peer dependency. Both apps already provide it, and `ui` doesn't
  bundle its own.
- Each control is semantic HTML first: a real `button`, `input` or `fieldset`,
  so keyboard and screen-reader behaviour comes from the platform.
- Styling is plain CSS that reads the tokens, written in `@layer components`
  and imported by the app as a stylesheet. No CSS-in-JS, and no Tailwind
  dependency in `ui`.
- Sketches may use tokens and controls, and don't have to. See Sketchbook's
  [0016](../../apps/sketchbook/docs/adr/0016-sketches-may-use-ui.md) for what
  that changes in the playground.
- Controls ship to production, and replace `dialkit` once a Panel exists. Until
  then `dialkit` stays as the dev overlay.

## Consequences
- `packages/ui` stops being tokens-only. It gains a React peer dependency, a
  component test setup and a stylesheet per control, and its README has to say
  so when the first control lands.
- It stays consumer-neutral
  ([README](../../packages/ui/README.md#consuming)): a control's classes belong
  to `ui`, and nothing in it names a selector, class or path from one app.
- Layered CSS loses to unlayered CSS whatever the order, so an app's own rules
  always override a control without a specificity fight. An app that uses
  cascade layers must declare `components` after `base`.
- Renaming or removing a control's prop or class changes every consumer, so it
  updates them in the same pull request, as for tokens.
- A sketch that imports `@mlduke/ui` is no longer a file you can copy out on its
  own. It needs the package with it.
- Dropping `dialkit` is a later change, once a Panel can stand in for it, and
  gets its own record.
