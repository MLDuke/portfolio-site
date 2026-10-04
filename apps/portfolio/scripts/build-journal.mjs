#!/usr/bin/env node
/**
 * Read published sketchbook entries from apps/sketchbook/entries and emit the
 * portfolio journal data.
 *
 * The source sits in this monorepo, so there is no network step and nothing to
 * fall back on: a missing entries/ folder or content that violates the contract
 * fails the build.
 *
 * app/data/journal.generated.ts and the media under public/journal/ are
 * gitignored build output; `dev`, `build` and the test scripts regenerate them
 * through their `pre*` hooks.
 */
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildEntries,
  copyEntryMedia,
  writeGeneratedFile,
} from "./journal-contract.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GENERATED_FILE = path.join(ROOT, "app/data/journal.generated.ts");
const PUBLIC_JOURNAL_DIR = path.join(ROOT, "public/journal");
const SKETCHBOOK_ROOT = path.resolve(ROOT, "../sketchbook");
const SOURCE_BLOB_BASE =
  process.env.SKETCHBOOK_SOURCE_BLOB_BASE ??
  "https://github.com/MLDuke/portfolio-site/blob/main/apps/sketchbook";

function main() {
  const entries = buildEntries(SKETCHBOOK_ROOT, {
    sourceBlobBase: SOURCE_BLOB_BASE,
  });

  rmSync(PUBLIC_JOURNAL_DIR, { force: true, recursive: true });
  for (const entry of entries) {
    copyEntryMedia(entry, PUBLIC_JOURNAL_DIR);
  }

  writeGeneratedFile(entries, {
    generatedFile: GENERATED_FILE,
    sourceBlobBase: SOURCE_BLOB_BASE,
  });
  console.log(`journal.generated.ts written - ${entries.length} entries`);
}

main();
