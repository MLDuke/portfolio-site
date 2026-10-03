#!/usr/bin/env node
/**
 * Emit CSS custom properties from the GTC token set.
 *
 * Reads global/ and theme/ (DTCG JSON), writes tokens.css. globals.css @imports
 * that file, so the token JSON is the single source of truth for colour,
 * spacing, radius, typography, motion and elevation primitives.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compileTokenCss } from "./compiler.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const result = compileTokenCss(ROOT);

writeFileSync(join(ROOT, "tokens.css"), result.css);
console.log(
  `tokens.css written — ${result.globalCount} global, ${result.themeCount} theme tokens`,
);
