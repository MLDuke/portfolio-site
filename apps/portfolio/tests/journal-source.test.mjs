import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  buildEntries,
  SOURCE_FILES_BYTE_CAP,
} from "../scripts/journal-contract.mjs";

/**
 * Builds a one-entry sketchbook whose sourcePath is `demo/`, populated from a
 * map of relative path -> contents (a Buffer is written as-is), and returns the
 * entry's source block, if it has one.
 */
function buildSourceBlock(files, { type = "code" } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "journal-source-test-"));
  const entryDir = path.join(root, "entries/entry-one");

  mkdirSync(path.join(entryDir, "demo"), { recursive: true });
  writeFileSync(
    path.join(entryDir, "index.md"),
    [
      "---",
      "publish: true",
      "title: Entry One",
      "description: Short description",
      "date: 2026-01-15",
      "slug: entry-one",
      `type: ${type}`,
      "sourcePath: demo",
      "---",
      "",
      "Body.",
    ].join("\n"),
  );

  for (const [relativePath, contents] of Object.entries(files)) {
    const file = path.join(entryDir, "demo", relativePath);

    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, contents);
  }

  const [entry] = buildEntries(root);

  return entry.blocks.find((block) => block.type === "source");
}

function paths(block) {
  return block.files.map((file) => file.path);
}

test("a source block carries the README markdown and the files, with no link", () => {
  const block = buildSourceBlock({
    "README.md": "# Demo\n\nSome **notes**.\n",
    "sketch.ts": "export const a = 1;\n",
  });

  assert.equal(block.type, "source");
  assert.equal(block.readme, "# Demo\n\nSome **notes**.");
  assert.deepEqual(block.files, [
    { path: "sketch.ts", contents: "export const a = 1;\n" },
  ]);
  assert.equal("href" in block, false);
});

test("code and mixed entries get a source block", () => {
  for (const type of ["code", "mixed"]) {
    const block = buildSourceBlock({ "README.md": "# Demo" }, { type });

    assert.equal(block.type, "source");
  }
});

test("image entries get no source block", () => {
  assert.equal(
    buildSourceBlock({ "README.md": "# Demo" }, { type: "image" }),
    undefined,
  );
});

test("a sourcePath without a README is a hard error", () => {
  assert.throws(
    () => buildSourceBlock({ "sketch.ts": "export {};" }),
    /entry-one: sourcePath must contain a README\.md/,
  );
});

test("the README is matched case-insensitively and left out of files", () => {
  const block = buildSourceBlock({
    "readme.md": "lowercase readme",
    "notes.md": "other markdown",
  });

  assert.equal(block.readme, "lowercase readme");
  assert.deepEqual(paths(block), ["notes.md"]);
});

test("a nested README is a file, not the README", () => {
  const block = buildSourceBlock({
    "README.md": "top",
    "lib/README.md": "nested",
  });

  assert.equal(block.readme, "top");
  assert.deepEqual(paths(block), ["lib/README.md"]);
});

test("source files are sorted by path, nested folders included", () => {
  const block = buildSourceBlock({
    "README.md": "# Demo",
    "z.ts": "z",
    "lib/b.ts": "b",
    "a.css": "a",
    "lib/a.ts": "a",
  });

  assert.deepEqual(paths(block), ["a.css", "lib/a.ts", "lib/b.ts", "z.ts"]);
});

test("binaries and test files are skipped", () => {
  const block = buildSourceBlock({
    "README.md": "# Demo",
    "sketch.ts": "export {};",
    "sketch.test.ts": "test file",
    "lib/util.test.mjs": "test file",
    // Not on the extension allow-list.
    "cover.png": Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00]),
    "font.woff2": "text content, but not an allow-listed extension",
    // On the allow-list, but a NUL byte gives it away as binary.
    "blob.json": Buffer.from([0x7b, 0x00, 0x7d]),
  });

  assert.deepEqual(paths(block), ["sketch.ts"]);
});

test("node_modules, hidden folders and lockfiles are skipped", () => {
  const block = buildSourceBlock({
    "README.md": "# Demo",
    "sketch.ts": "export {};",
    "node_modules/dep/index.js": "dep",
    ".cache/state.json": "{}",
    "package-lock.json": "{}",
  });

  assert.deepEqual(paths(block), ["sketch.ts"]);
});

test("source files over 64 KB in total fail the build with a clear message", () => {
  const half = "x".repeat(SOURCE_FILES_BYTE_CAP / 2);

  assert.throws(
    () =>
      buildSourceBlock({
        "README.md": "# Demo",
        "a.ts": half,
        "b.ts": half,
        "c.ts": "one more byte",
      }),
    /entry-one: source files total 64\.0 KB, over the 64\.0 KB limit\. Largest: [ab]\.ts \(32\.0 KB\)/,
  );
});

test("source files totalling exactly 64 KB are accepted", () => {
  const half = "x".repeat(SOURCE_FILES_BYTE_CAP / 2);
  const block = buildSourceBlock({
    "README.md": "# Demo",
    "a.ts": half,
    "b.ts": half,
  });

  assert.equal(block.files.length, 2);
});

test("the cap counts bytes, not characters, and ignores the README", () => {
  // 3 bytes per character: 22,000 characters is 66,000 bytes.
  assert.throws(
    () =>
      buildSourceBlock({
        "README.md": "# Demo",
        "a.ts": "€".repeat(22_000),
      }),
    /source files total 64\.5 KB/,
  );

  const block = buildSourceBlock({
    "README.md": "x".repeat(SOURCE_FILES_BYTE_CAP * 2),
    "a.ts": "export {};",
  });

  assert.equal(block.files.length, 1);
});
