# @mlduke/ui

Shared UI for the apps in this monorepo. So far it's the design tokens, the source of truth
for visual primitives, as a [GTC](https://buninux.com/design-tokens) token set
(Global / Theme / Component) in DTCG JSON, compiled to CSS custom properties. It
also ships the IBM Plex fonts the typography tokens name.

The code is public to read, but no licence has been granted, so all rights are
reserved. The exception is the font files under `fonts/`. IBM Plex is © IBM Corp.
and licensed under the SIL Open Font License 1.1, whose text is in
[`fonts/OFL.txt`](fonts/OFL.txt) and travels with the files.

## Consuming

`@mlduke/ui` is an npm workspace (`packages/ui`) of this repo, not a published
package. An app lists it in its own `package.json` with the wildcard range:

```json
"@mlduke/ui": "*"
```

A root `npm ci` links it into `node_modules/@mlduke/ui`, so edits to the tokens
show up in every app without a reinstall. The generated CSS is committed, so
consuming it doesn't run a build.

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

**Fonts.** The font-family tokens read
`var(--font-ibm-plex-sans), ui-sans-serif, system-ui, sans-serif` (and
`--font-ibm-plex-mono` for mono). The package ships IBM Plex Sans and IBM Plex Mono
at weights 400, 500, 600 and 700, normal style, latin subset, as woff2. Load them in
one of two ways:

- Import `@mlduke/ui/fonts.css` alongside `tokens.css`. It declares one
  `@font-face` per file and sets both variables. Bundlers such as Vite and Next
  resolve its relative `url()`s and emit the files as hashed assets.
- Use your own font loader, such as `next/font/local`, pointed at
  `@mlduke/ui/fonts/*.woff2`, and have it set `--font-ibm-plex-sans` and
  `--font-ibm-plex-mono`. Don't also import `fonts.css`, or the fonts load twice.

Leave the variables unset to fall back to system fonts. The files are IBM Plex Sans
1.1.0 and IBM Plex Mono 2.5.0 from IBM's releases at
[github.com/IBM/plex](https://github.com/IBM/plex), taken from IBM's "Latin1" split
and renamed (`IBMPlexSans-Regular-Latin1.woff2` → `IBMPlexSans-Regular.woff2`).
`fonts.css` uses the same `unicode-range` as IBM's split CSS. Characters outside
it, such as the arrows `←` and `→`, render in the fallback font.

**Versioning.** There are no tags, releases or version bumps: every app builds
against the `packages/ui` in the same commit, and the `version` field in
`package.json` stays as it is. A token's CSS variable is still its public API, so
a change that removes or renames one has to update every consumer in the same pull
request. Adding a token, or changing a value without renaming it, needs nothing
else.

**Consumer-neutral.** Nothing in `ui` names a selector, class or path from one
app. A token says what it is for (`--focus-ring-color`), never who uses it. An app
wires tokens to its own selectors and utilities in its own stylesheet, and when
a token needs a note about a framework's behaviour, describe the behaviour, not
an app.

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
fonts/            IBM Plex woff2 files + OFL.txt
fonts.css         hand-written @font-face rules for fonts/
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

One name is deliberately not `--shadow-*`, for Tailwind consumers. Tailwind inlines `@theme` shadow values into the generated utility
at build time, so `@theme` has to alias `--shadow-raised` to a *different* var
that flips per theme. `theme.elevation.*` is that var — naming
it `theme.shadow.*` would produce `--shadow-raised`, which Tailwind has already
inlined past, and the dark shadows would silently never apply.

## Test

```
npm test
```

The token compiler test validates the local DTCG shape that `build-css.mjs`
accepts and checks representative CSS output. The fonts test checks that
`fonts.css` and `fonts/` list the same files.

## The interaction contract

`--state-layer-*`, `--focus-ring-*`, `--interaction-*` and `--content-disabled`
are theme tokens like any other. Two of them bend the usual shape:

- `theme.focus-ring.color` aliases `{theme.on-surface.primary}` rather than a
  global ramp step. The ring *is* the primary ink — pointing it at a neutral
  step would duplicate that decision and let the two drift.
- `global.state-layer.on-light` / `.on-dark` name the surface they sit on, not
  the theme they belong to. The light theme takes `on-light` and the dark theme
  takes `on-dark`, but a surface that paints its own fill regardless of page
  theme reaches for the primitive directly.

If your stylesheet uses cascade layers, import `tokens.css` into a low layer
(`@import "@mlduke/ui/tokens.css" layer(base);`), not unlayered. A surface that re-points
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
