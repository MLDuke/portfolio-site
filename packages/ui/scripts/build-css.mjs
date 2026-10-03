#!/usr/bin/env node
/**
 * Emit CSS custom properties from the GTC token set.
 *
 * Reads tokens/global and tokens/theme (DTCG JSON), writes dist/tokens.css.
 * Consumers @import that file, so the token JSON is the single source of truth
 * for colour, spacing, radius, typography, motion and elevation primitives.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compileTokenCss } from "./compiler.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const result = compileTokenCss(join(ROOT, "tokens"));

writeFileSync(join(ROOT, "dist", "tokens.css"), result.css);
console.log(
  `dist/tokens.css written — ${result.globalCount} global, ${result.themeCount} theme tokens`,
);
