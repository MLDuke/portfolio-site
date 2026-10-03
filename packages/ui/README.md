# @mlduke/ui

Shared UI for MLDuke's projects. v0.1 is the design tokens: the source of truth
for visual primitives, as a [GTC](https://buninux.com/design-tokens) token set
(Global / Theme / Component) in DTCG JSON, compiled to CSS custom properties.

The code is public to read, but no licence has been granted, so all rights are reserved.

## Consuming

Install from a git tag. There is no registry release, and the generated CSS is
committed, so installing doesn't run a build:

```
npm i github:MLDuke/ui#v0.1.0
```

Import the tokens once, before any styles that read them:

```css
@import "@mlduke/ui/tokens.css";
```

or, from a bundler entry point, `import "@mlduke/ui/tokens.css";`. The DTCG source is
also exported as `@mlduke/ui/tokens/*` for tools that want the raw JSON.

**Theme scoping.** Global primitives are declared on `:root`. Theme tokens are
declared twice: in light mode on `:root, [data-theme="light"]`, and in dark mode on
`[data-theme="dark"]`. Put `data-theme="dark"` on `<html>` for a dark page, or
on any element to open a nested scope. A `data-theme="light"` element inside a
dark page flips back. The package doesn't set `color-scheme`; set it alongside
`data-theme` if you want native controls and scrollbars to follow.

**Fonts.** The package doesn't load fonts. The font-family tokens read
`var(--font-ibm-plex-sans), ui-sans-serif, system-ui, sans-serif` (and
`--font-ibm-plex-mono` for mono). Set those two variables (for example with
`next/font` or `@fontsource`) to get IBM Plex, or leave them unset to fall back to
system fonts.

**Versioning.** Semver over the token names, since a token's CSS variable is
its public API. Removing or renaming a token is a **major** bump. Adding a token
is a **minor** bump. Changing a value without renaming it is a **patch**. Each
consumer pins a tag and upgrades on its own schedule.

## Layout

```
tokens/
  global/
    color/          neutral / green / blue / amber / red ramps + opacity scale
    size-unit/      spacing scale
    radius/         corner radii
    typography/     font-family / font-weight / font-size / line-height scales
    motion/         easing + duration
    effects/        multi-layer shadow primitives, per theme
    state-layer/    hover / pressed / selected tints, on-light + on-dark
  theme/            light + dark, each token aliasing a global primitive
    surface/  on-surface/  border/  accent/  status/  elevation/
    state-layer/  focus-ring/  interaction/  content/  media-tone/
  component/        (not tokenised yet)
scripts/          compiler.mjs + build-css.mjs
dist/tokens.css   generated, committed
```

All dimensional values are **px** in the JSON — GTC's factual scale keys require
it (`size-unit.16` is `"16px"`). The build converts the scales that must track a
user's browser font-size preference (`size-unit`, `radius`, `typography.font-size`,
`typography.line-height`) to **rem** on the way out, so text still resizes to 200%
per WCAG 1.4.4. Shadow offsets and blurs stay px — they are optical, not
dimensional.

## Build

```
npm run build
```

Writes `dist/tokens.css`, which is committed. Don't edit it by hand, because the
build regenerates it. CI fails if the committed file doesn't match a fresh build,
so commit the regenerated CSS together with the JSON change.

CSS variable name = token path minus the group segment, joined with `-`:
`theme.accent.a.base` → `--accent-a-base`, `global.typography.font-size.body-medium`
→ `--typography-font-size-body-medium`.

One name is deliberately not `--shadow-*`, for Tailwind consumers such as
portfolio-site. Tailwind inlines `@theme` shadow values into the generated utility
at build time, so `@theme` has to alias `--shadow-raised` to a *different* var
that flips per theme. `theme.elevation.*` is that var — naming
it `theme.shadow.*` would produce `--shadow-raised`, which Tailwind has already
inlined past, and the dark shadows would silently never apply.

## Test

```
npm test
```

The token compiler test validates the local DTCG shape that `build-css.mjs`
accepts and checks representative CSS output.

## The interaction contract

`--state-layer-*`, `--focus-ring-*`, `--interaction-*` and `--content-disabled`
are theme tokens like any other. Two of them bend the usual shape:

- `theme.focus-ring.color` aliases `{theme.on-surface.primary}` rather than a
  global ramp step. The ring *is* the primary ink — pointing it at a neutral
  step would duplicate that decision and let the two drift.
- `global.state-layer.on-light` / `.on-dark` name the surface they sit on, not
  the theme they belong to. The light theme takes `on-light` and the dark theme
  takes `on-dark`, but a surface that paints its own fill regardless of page
  theme (portfolio-site's `accent-surface` and `modal-surface`) reaches for the
  primitive directly.

If your stylesheet uses cascade layers, import `tokens.css` into a low layer
(portfolio-site uses `layer(base)`), not unlayered. A surface that re-points
`--state-layer-*` or `--focus-ring-color` does it from a layered rule, and an
unlayered `:root` declaration outranks every layered rule. A dark modal on a
light page would then keep the light state layers.

## Status colours

`theme.status.warning` and `theme.status.error` each have three tokens:

- `base`: a solid status fill, for a badge, banner or icon. Don't use it as text
  on a surface. Warning `base` is a light amber in both modes.
- `on`: text and icons placed on `base`. Contrast is at least 5:1 in both modes.
- `border`: the outline of a status panel on any surface. Contrast is at least
  3:1 against `surface-base`, `surface-raised` and `surface-overlay` in both modes
  (WCAG 1.4.11).

The amber and red global ramps use the same OKLCH lightness steps as the green
and blue ramps, so `amber.5` and `blue.5` have equal perceived lightness.
