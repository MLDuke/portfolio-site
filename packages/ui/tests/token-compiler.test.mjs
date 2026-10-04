import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { compileTokenCss } from "../scripts/compiler.mjs";

test("compiles repository tokens into CSS variables", () => {
  const result = compileTokenCss(path.resolve("tokens"));

  // Counts, not exact totals: adding a token should not fail a test whose
  // message says nothing about what changed.
  assert.ok(result.globalCount > 100, `globalCount was ${result.globalCount}`);
  assert.ok(result.themeCount > 20, `themeCount was ${result.themeCount}`);
  assert.match(result.css, /--size-unit-16: 1rem;/);
  assert.match(result.css, /--focus-ring-color: var\(--on-surface-primary\);/);
  assert.match(result.css, /^\[data-theme="dark"\] \{$/m);
  assert.match(result.css, /^\[data-theme="light"\] \{$/m);
  assert.doesNotMatch(result.css, /sandbox-theme/);
});

test("rejects token leaves without a type", () => {
  const root = mkdtempSync(path.join(tmpdir(), "token-compiler-test-"));

  mkdirSync(path.join(root, "global/color"), { recursive: true });
  mkdirSync(path.join(root, "theme/surface"), { recursive: true });
  writeFileSync(
    path.join(root, "global/color/color.json"),
    JSON.stringify({
      global: {
        color: {
          neutral: {
            "0": {
              $value: "#fff",
            },
          },
        },
      },
    }),
  );
  writeFileSync(
    path.join(root, "theme/surface/surface.json"),
    JSON.stringify({
      theme: {},
    }),
  );

  assert.throws(() => compileTokenCss(root), /color\.neutral\.0 must declare a \$type/);
});

test("theme tokens are emitted into both mode blocks, aliased to a primitive", () => {
  const { css } = compileTokenCss(path.resolve("tokens"));
  const darkStart = css.indexOf('[data-theme="dark"]');
  const lightBlock = css.slice(css.indexOf(":root,"), darkStart);
  const darkBlock = css.slice(darkStart);

  for (const tone of ["neutral", "dark", "blue", "green"]) {
    const alias = new RegExp(`--media-tone-${tone}: var\\(--color-`);

    assert.match(lightBlock, alias);
    assert.match(darkBlock, alias);
  }

  for (const status of ["warning", "error"]) {
    for (const part of ["base", "on", "border"]) {
      const alias = new RegExp(`--status-${status}-${part}: var\\(--color-`);

      assert.match(lightBlock, alias);
      assert.match(darkBlock, alias);
    }
  }
});
