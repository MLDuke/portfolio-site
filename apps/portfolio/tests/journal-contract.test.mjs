import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  buildEntries,
  copyEntryMedia,
  missingGeneratedMedia,
  resolveJournalBuild,
  writeGeneratedFile,
} from "../scripts/journal-contract.mjs";

test("builds journal entries from published sketchbook content", () => {
  const root = mkdtempSync(path.join(tmpdir(), "journal-contract-test-"));
  const entryDir = path.join(root, "entries/entry-one");
  const sourceDir = path.join(entryDir, "demo");
  const publicJournalDir = path.join(root, "public/journal");
  const generatedFile = path.join(root, "app/data/journal.generated.ts");

  mkdirSync(sourceDir, { recursive: true });
  mkdirSync(path.dirname(generatedFile), { recursive: true });
  writeFileSync(path.join(entryDir, "cover.png"), "fake image");
  writeFileSync(path.join(sourceDir, "README.md"), "# Demo");
  writeFileSync(
    path.join(entryDir, "index.md"),
    [
      "---",
      "publish: true",
      "title: Entry One",
      "description: Short description",
      "date: 2026-01-15",
      "slug: entry-one",
      "type: mixed",
      "sourcePath: demo",
      "media:",
      "  - src: cover.png",
      "    alt: Cover image",
      "    caption: Cover caption",
      "---",
      "",
      "Body **markdown**.",
    ].join("\n"),
  );

  const entries = buildEntries(root, {
    sourceBlobBase: "https://example.com/sketchbook/blob/main",
  });

  assert.equal(entries.length, 1);
  assert.equal(entries[0].index, "001");
  assert.equal(entries[0].cardMedia.src, "/journal/entry-one/cover.png");
  assert.equal(entries[0].blocks[0].type, "description");
  assert.equal(entries[0].blocks[1].type, "figure");
  assert.equal(entries[0].blocks[2].type, "sourceLink");

  copyEntryMedia(entries[0], publicJournalDir);
  assert.equal(
    existsSync(path.join(publicJournalDir, "entry-one/cover.png")),
    true,
  );

  writeGeneratedFile(entries, {
    generatedFile,
    sourceBlobBase: "https://example.com/sketchbook/blob/main",
  });

  const generated = readFileSync(generatedFile, "utf8");

  assert.match(generated, /export const journalEntries/);
  assert.doesNotMatch(generated, /sourceDir|sourceMedia/);
  assert.deepEqual(missingGeneratedMedia({ generatedFile, root }), []);
});

test("keeps build-only fields out of the generated file without a copy step", () => {
  const root = mkdtempSync(path.join(tmpdir(), "journal-contract-test-"));
  const generatedFile = path.join(root, "journal.generated.ts");

  writeGeneratedFile(
    [{ slug: "entry-one", sourceDir: "/tmp/checkout", sourceMedia: [] }],
    {
      generatedFile,
      sourceBlobBase: "https://example.com/sketchbook/blob/main",
    },
  );

  assert.doesNotMatch(readFileSync(generatedFile, "utf8"), /sourceDir|\/tmp/);
});

test("rejects media paths that escape the entry directory", () => {
  const root = mkdtempSync(path.join(tmpdir(), "journal-contract-test-"));
  const entryDir = path.join(root, "entries/entry-one");

  mkdirSync(entryDir, { recursive: true });
  writeFileSync(
    path.join(entryDir, "index.md"),
    [
      "---",
      "publish: true",
      "title: Entry One",
      "description: Short description",
      "date: 2026-01-15",
      "slug: entry-one",
      "type: image",
      "media:",
      "  - src: ../cover.png",
      "    alt: Cover image",
      "---",
      "",
      "Body.",
    ].join("\n"),
  );

  assert.throws(
    () =>
      buildEntries(root, {
        sourceBlobBase: "https://example.com/sketchbook/blob/main",
      }),
    /media src must be relative and stay within the entry/,
  );
});

test("a reachable source is always regenerated", () => {
  const root = mkdtempSync(path.join(tmpdir(), "journal-resolve-"));

  assert.deepEqual(
    resolveJournalBuild({
      generatedFile: path.join(root, "journal.generated.ts"),
      root,
      sourceRoot: "/tmp/checkout",
    }),
    { action: "regenerate", sourceRoot: "/tmp/checkout" },
  );
});

test("an unreachable source keeps committed data whose media is on disk", () => {
  const root = mkdtempSync(path.join(tmpdir(), "journal-resolve-"));
  const generatedFile = path.join(root, "journal.generated.ts");

  mkdirSync(path.join(root, "public/journal/entry-one"), { recursive: true });
  writeFileSync(path.join(root, "public/journal/entry-one/cover.png"), "png");
  writeFileSync(
    generatedFile,
    'export const journalEntries = [{ "src": "/journal/entry-one/cover.png" }];',
  );

  assert.deepEqual(
    resolveJournalBuild({
      generatedFile,
      root,
      unavailableReason: "Unable to fetch sketchbook tarball: HTTP 503",
    }),
    { action: "keep", reason: "Unable to fetch sketchbook tarball: HTTP 503" },
  );
});

test("an unreachable source fails the build when the committed media is gone", () => {
  const root = mkdtempSync(path.join(tmpdir(), "journal-resolve-"));
  const generatedFile = path.join(root, "journal.generated.ts");

  writeFileSync(
    generatedFile,
    'export const journalEntries = [{ "src": "/journal/entry-one/cover.png" }];',
  );

  assert.throws(
    () =>
      resolveJournalBuild({
        generatedFile,
        root,
        unavailableReason: "Unable to fetch sketchbook tarball: HTTP 503",
      }),
    /its media is missing: \/journal\/entry-one\/cover\.png/,
  );
});

test("an unreachable source fails the build when there is nothing to fall back on", () => {
  const root = mkdtempSync(path.join(tmpdir(), "journal-resolve-"));

  assert.throws(
    () =>
      resolveJournalBuild({
        generatedFile: path.join(root, "journal.generated.ts"),
        root,
        unavailableReason: "Unable to extract sketchbook tarball: corrupt",
      }),
    /no generated journal data to fall back on/,
  );
});
