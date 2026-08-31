# Design tokens

The source of truth for the site's visual primitives. A
[GTC](https://buninux.com/design-tokens) token set (Global / Theme / Component)
in DTCG JSON.

```
global/
  color/          neutral / green / blue ramps + opacity scale
  size-unit/      spacing scale
  radius/         corner radii
  typography/     font-family / font-weight / font-size / line-height scales
  motion/         easing + duration
  effects/        multi-layer shadow primitives, per theme
  state-layer/    hover / pressed / selected tints, on-light + on-dark
theme/            light + dark, each token aliasing a global primitive
  surface/  on-surface/  border/  accent/  elevation/
  state-layer/  focus-ring/  interaction/  content/
component/         (not tokenised yet)
```

All dimensional values are **px** in the JSON — GTC's factual scale keys require
it (`size-unit.16` is `"16px"`). The build converts the scales that must track a
user's browser font-size preference (`size-unit`, `radius`, `typography.font-size`,
`typography.line-height`) to **rem** on the way out, so text still resizes to 200%
per WCAG 1.4.4. Shadow offsets and blurs stay px — they are optical, not
dimensional.

## Build

```
node app/tokens/build-css.mjs      # or: npm run tokens   (also runs on prebuild)
```

Writes `tokens.css` (git-tracked). `app/globals.css` `@import`s it and its
`@theme` block references the generated vars. Editing `tokens.css` by hand is
pointless — it is regenerated.

CSS variable name = token path minus the group segment, joined with `-`:
`theme.accent.a.base` → `--accent-a-base`, `global.typography.font-size.body-medium`
→ `--typography-font-size-body-medium`.

One name is deliberately not `--shadow-*`: Tailwind inlines `@theme` shadow values
into the generated utility at build time, so `@theme` has to alias `--shadow-raised`
to a *different* var that flips per theme. `theme.elevation.*` is that var — naming
it `theme.shadow.*` would produce `--shadow-raised`, which Tailwind has already
inlined past, and the dark shadows would silently never apply.

## Audit

```
python3 ~/.claude/skills/gtc-tokens/validate.py app/tokens
```

or the `/gtc-tokens audit` Claude Code skill.

## The interaction contract

`--state-layer-*`, `--focus-ring-*`, `--interaction-*` and `--content-disabled`
are theme tokens like any other. Two of them bend the usual shape:

- `theme.focus-ring.color` aliases `{theme.on-surface.primary}` rather than a
  global ramp step. The ring *is* the primary ink — pointing it at a neutral
  step would duplicate that decision and let the two drift.
- `global.state-layer.on-light` / `.on-dark` name the surface they sit on, not
  the theme they belong to. The light theme takes `on-light` and the dark theme
  takes `on-dark`, but `accent-surface` and `modal-surface` paint their own
  fill regardless of page theme, so they reach for the primitive directly.

`globals.css` imports `tokens.css` into `layer(base)`, not unlayered. Those two
utilities re-point `--state-layer-*` and `--focus-ring-color`, and an unlayered
`:root` declaration outranks every layered rule — a dark modal on a light page
would keep the light state layers.

## Still in globals.css (not tokens)

The `--text-<size>--font-weight-emphasized` aliases: Tailwind's double-hyphen
text-style shape is not a token path `build-css.mjs` can emit. The `--space-*`
scale was removed entirely (radius now aliases `--radius-*`, component spacing
goes through Tailwind's `--spacing`).
