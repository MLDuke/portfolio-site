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
/**
 * JOURNAL_SOURCE_ROOT points the build at a different sketchbook root (a folder
 * with an entries/ directory), resolved from apps/portfolio. It exists only so
 * the e2e suite can build the journal from tests/fixtures/sketchbook. Leave it
 * unset everywhere else and the journal comes from apps/sketchbook.
 */
const SKETCHBOOK_ROOT = process.env.JOURNAL_SOURCE_ROOT
  ? path.resolve(ROOT, process.env.JOURNAL_SOURCE_ROOT)
  : path.resolve(ROOT, "../sketchbook");

function main() {
  if (process.env.JOURNAL_SOURCE_ROOT) {
    console.log(`journal source override: ${SKETCHBOOK_ROOT}`);
  }

  const entries = buildEntries(SKETCHBOOK_ROOT);

  rmSync(PUBLIC_JOURNAL_DIR, { force: true, recursive: true });
  for (const entry of entries) {
    copyEntryMedia(entry, PUBLIC_JOURNAL_DIR);
  }

  writeGeneratedFile(entries, { generatedFile: GENERATED_FILE });
  console.log(`journal.generated.ts written - ${entries.length} entries`);
}

main();
