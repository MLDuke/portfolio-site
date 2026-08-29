#!/usr/bin/env node
/**
 * Emit CSS custom properties from the GTC token set.
 *
 * Reads global/ and theme/ (DTCG JSON, deep-merged the way validate.py does),
 * writes tokens.css. globals.css @imports that file, so the token JSON is the
 * single source of truth for colour, spacing, radius, typography, motion and
 * elevation primitives.
 *
 *   node app/tokens/build-css.mjs        (or: npm run tokens)
 *
 * Naming: a token's CSS variable is its name-path minus the group segment,
 * joined with "-"  ->  global.color.neutral.0        -> --color-neutral-0
 *                      global.size-unit.16            -> --size-unit-16
 *                      global.typography.font-size.body-medium
 *                                                    -> --typography-font-size-body-medium
 *                      theme.elevation.raised        -> --elevation-raised
 *
 * Global tokens emit their raw value on :root. Theme tokens emit one value per
 * theme mode (light / dark), each aliased to the global var it points at, on the
 * same selectors globals.css already uses for theme switching.
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));

const LIGHT_SELECTOR = ':root,\n.sandbox-theme[data-theme="light"]';
const DARK_SELECTOR = 'html[data-theme="dark"],\n.sandbox-theme[data-theme="dark"]';

function walkJsonFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walkJsonFiles(full));
    else if (entry.endsWith(".json")) out.push(full);
  }
  return out;
}

function deepMerge(dst, src) {
  for (const [k, v] of Object.entries(src)) {
    if (v && typeof v === "object" && !Array.isArray(v) && dst[k] && typeof dst[k] === "object") {
      deepMerge(dst[k], v);
    } else {
      dst[k] = v;
    }
  }
  return dst;
}

function load(group) {
  const merged = {};
  for (const file of walkJsonFiles(join(ROOT, group)).sort()) {
    deepMerge(merged, JSON.parse(readFileSync(file, "utf8")));
  }
  return merged[group] ?? {};
}

/** Collect { name, node } for every token ($value leaf) under `tree`. */
function collectTokens(tree, path, acc) {
  if (tree && typeof tree === "object" && "$value" in tree) {
    acc.push({ name: path.join("-"), node: tree });
    return acc;
  }
  if (tree && typeof tree === "object") {
    for (const [k, v] of Object.entries(tree)) {
      if (k.startsWith("$")) continue;
      collectTokens(v, [...path, k], acc);
    }
  }
  return acc;
}

const isAlias = (v) => typeof v === "string" && /^\{.+\}$/.test(v);
const aliasVar = (v) => `var(--${v.slice(1, -1).split(".").slice(1).join("-")})`;

const shadowLayer = (s) =>
  `${s.offsetX} ${s.offsetY} ${s.blur}${s.spread && s.spread !== "0px" ? " " + s.spread : ""} ${s.color}`;

// Scales that have to track the user's font-size preference (WCAG 1.4.4): text,
// its line heights, the spacing unit every Tailwind p-* / gap-* / size-* resolves
// against, and radius so a scaled control keeps its proportions. Their JSON stays
// px — GTC's scale keys are factual — and is divided by the 16px root default
// here. Shadow offsets and blurs are deliberately absent: they are optical, not
// dimensional. `radius-pill` is a "large enough" sentinel rather than a scale
// step, so it stays px too.
const REM_SCALES = [
  "radius",
  "size-unit",
  "typography-font-size",
  "typography-line-height",
];
const PX_TOKENS = new Set(["radius-pill"]);
const ROOT_FONT_SIZE = 16;

const scalesWithText = (name) =>
  !PX_TOKENS.has(name) &&
  REM_SCALES.some((scale) => name === scale || name.startsWith(`${scale}-`));

function toRem(value) {
  if (!/^-?[\d.]+px$/.test(value)) return value;

  const px = Number.parseFloat(value);

  return px === 0 ? "0" : `${px / ROOT_FONT_SIZE}rem`;
}

/** DTCG value (already de-aliased) -> CSS token string. */
function formatValue(value, type, name) {
  if (isAlias(value)) return aliasVar(value);
  if (type === "cubicBezier" && Array.isArray(value)) return `cubic-bezier(${value.join(", ")})`;
  if (type === "shadow") {
    const layers = Array.isArray(value) ? value : [value];
    return layers.map(shadowLayer).join(", ");
  }
  if (type === "dimension" && scalesWithText(name)) return toRem(String(value));
  return String(value);
}

// --- global primitives -----------------------------------------------------
const globalTokens = collectTokens(load("global"), [], []);
const globalLines = globalTokens.map(
  ({ name, node }) => `  --${name}: ${formatValue(node.$value, node.$type, name)};`,
);

// --- theme (one block per mode) ------------------------------------------
const themeTokens = collectTokens(load("theme"), [], []);
const lightLines = [];
const darkLines = [];
for (const { name, node } of themeTokens) {
  const modes = node.$extensions?.mode ?? {};
  lightLines.push(`  --${name}: ${formatValue(modes.light ?? node.$value, node.$type, name)};`);
  darkLines.push(`  --${name}: ${formatValue(modes.dark ?? modes.light ?? node.$value, node.$type, name)};`);
}

const css = `/* GENERATED by app/tokens/build-css.mjs — do not edit by hand.
   Source of truth: app/tokens/global and app/tokens/theme.
   Regenerate:      node app/tokens/build-css.mjs */

:root {
${globalLines.join("\n")}
}

${LIGHT_SELECTOR} {
${lightLines.join("\n")}
}

${DARK_SELECTOR} {
${darkLines.join("\n")}
}
`;

writeFileSync(join(ROOT, "tokens.css"), css);
console.log(
  `tokens.css written — ${globalTokens.length} global, ${themeTokens.length} theme tokens`,
);
