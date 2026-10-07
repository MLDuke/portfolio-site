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

  const entries = buildEntries(root);

  assert.equal(entries.length, 1);
  assert.equal(entries[0].index, "001");
  assert.equal(entries[0].cardMedia.src, "/journal/entry-one/cover.png");
  assert.equal(entries[0].blocks[0].type, "description");
  assert.equal(entries[0].blocks[1].type, "figure");
  assert.equal(entries[0].blocks[2].type, "source");
  assert.equal(entries[0].blocks[2].readme, "# Demo");

  copyEntryMedia(entries[0], publicJournalDir);
  assert.equal(
    existsSync(path.join(publicJournalDir, "entry-one/cover.png")),
    true,
  );

  writeGeneratedFile(entries, { generatedFile });

  const generated = readFileSync(generatedFile, "utf8");

  assert.match(generated, /export const journalEntries/);
  assert.doesNotMatch(generated, /sourceDir|sourceMedia/);
});

test("keeps build-only fields out of the generated file without a copy step", () => {
  const root = mkdtempSync(path.join(tmpdir(), "journal-contract-test-"));
  const generatedFile = path.join(root, "journal.generated.ts");

  writeGeneratedFile(
    [{ slug: "entry-one", sourceDir: "/tmp/checkout", sourceMedia: [] }],
    { generatedFile },
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
      buildEntries(root),
    /media src must be relative and stay within the entry/,
  );
});

test("a source without an entries directory is a hard error", () => {
  const root = mkdtempSync(path.join(tmpdir(), "journal-contract-test-"));

  assert.throws(
    () =>
      buildEntries(root),
    /Sketchbook has no entries\/ directory/,
  );
});

test("unpublished entries are left out", () => {
  const root = mkdtempSync(path.join(tmpdir(), "journal-contract-test-"));
  const entryDir = path.join(root, "entries/entry-one");

  mkdirSync(entryDir, { recursive: true });
  writeFileSync(
    path.join(entryDir, "index.md"),
    ["---", "publish: false", "title: Entry One", "---", "", "Body."].join(
      "\n",
    ),
  );

  assert.deepEqual(
    buildEntries(root),
    [],
  );
});

/**
 * Builds a one-entry sketchbook with `count` images (`image-1.png` ...), each
 * captioned unless `captions` is false, and returns the built entry.
 */
function buildImageEntry(count, { captions = true } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "journal-contract-test-"));
  const entryDir = path.join(root, "entries/entry-one");
  const images = Array.from({ length: count }, (_, i) => i + 1);

  mkdirSync(entryDir, { recursive: true });

  for (const n of images) {
    writeFileSync(path.join(entryDir, `image-${n}.png`), "fake image");
  }

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
      images.length ? "media:" : "media: []",
      ...images.flatMap((n) => [
        `  - src: image-${n}.png`,
        `    alt: Image ${n}`,
        ...(captions ? [`    caption: Caption ${n}`] : []),
      ]),
      "---",
      "",
      "Body.",
    ].join("\n"),
  );

  return buildEntries(root)[0];
}

function mediaTypes(entry) {
  return entry.blocks.slice(1).map((block) => block.type);
}

test("a single image stays a figure", () => {
  assert.deepEqual(mediaTypes(buildImageEntry(1)), ["figure"]);
});

test("two images become one gallery", () => {
  assert.deepEqual(mediaTypes(buildImageEntry(2)), ["gallery"]);
});

test("three images become a gallery and a trailing figure", () => {
  const entry = buildImageEntry(3);

  assert.deepEqual(mediaTypes(entry), ["gallery", "figure"]);
  assert.equal(entry.blocks[2].media.src, "/journal/entry-one/image-3.png");
});

test("four images become two galleries, paired in order", () => {
  const entry = buildImageEntry(4);

  assert.deepEqual(mediaTypes(entry), ["gallery", "gallery"]);
  assert.deepEqual(
    entry.blocks.slice(1).map((block) => block.items.map((i) => i.media.alt)),
    [
      ["Image 1", "Image 2"],
      ["Image 3", "Image 4"],
    ],
  );
});

test("an entry with no images has no media blocks", () => {
  assert.deepEqual(mediaTypes(buildImageEntry(0)), []);
});

test("gallery items carry the same shape a figure block does", () => {
  const [, gallery] = buildImageEntry(2).blocks;

  assert.deepEqual(gallery, {
    type: "gallery",
    items: [
      {
        media: {
          src: "/journal/entry-one/image-1.png",
          alt: "Image 1",
          caption: "Caption 1",
        },
        showCaption: true,
      },
      {
        media: {
          src: "/journal/entry-one/image-2.png",
          alt: "Image 2",
          caption: "Caption 2",
        },
        showCaption: true,
      },
    ],
  });
});

test("gallery items without a caption leave caption and showCaption out", () => {
  const [, gallery] = buildImageEntry(2, { captions: false }).blocks;

  for (const item of gallery.items) {
    assert.equal("caption" in item.media, false);
    assert.equal("showCaption" in item, false);
  }
});

test("galleries keep cardMedia on the first image and copy every image", () => {
  const entry = buildImageEntry(3);
  const publicJournalDir = mkdtempSync(path.join(tmpdir(), "journal-public-"));

  assert.equal(entry.cardMedia.src, "/journal/entry-one/image-1.png");
  assert.equal(entry.sourceMedia.length, 3);

  copyEntryMedia(entry, publicJournalDir);

  for (const n of [1, 2, 3]) {
    assert.equal(
      existsSync(path.join(publicJournalDir, `entry-one/image-${n}.png`)),
      true,
    );
  }
});

test("a gallery image is still validated like a figure", () => {
  const root = mkdtempSync(path.join(tmpdir(), "journal-contract-test-"));
  const entryDir = path.join(root, "entries/entry-one");

  mkdirSync(entryDir, { recursive: true });
  writeFileSync(path.join(entryDir, "image-1.png"), "fake image");
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
      "  - src: image-1.png",
      "    alt: Image 1",
      "  - src: missing.png",
      "    alt: Missing",
      "---",
      "",
      "Body.",
    ].join("\n"),
  );

  assert.throws(
    () => buildEntries(root),
    /media file does not exist: missing.png/,
  );
});

test("media blocks sit between the description and the source block", () => {
  const root = mkdtempSync(path.join(tmpdir(), "journal-contract-test-"));
  const entryDir = path.join(root, "entries/entry-one");

  mkdirSync(path.join(entryDir, "demo"), { recursive: true });
  writeFileSync(path.join(entryDir, "demo/README.md"), "# Demo");

  for (const n of [1, 2, 3]) {
    writeFileSync(path.join(entryDir, `image-${n}.png`), "fake image");
  }

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
      "  - { src: image-1.png, alt: One }",
      "  - { src: image-2.png, alt: Two }",
      "  - { src: image-3.png, alt: Three }",
      "---",
      "",
      "Body.",
    ].join("\n"),
  );

  assert.deepEqual(
    buildEntries(root)[0].blocks.map((block) => block.type),
    ["description", "gallery", "figure", "source"],
  );
});
