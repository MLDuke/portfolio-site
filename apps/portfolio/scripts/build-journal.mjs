#!/usr/bin/env node
/**
 * Fetch published sketchbook entries and emit the portfolio journal data.
 *
 * GitHub availability is deliberately treated differently from content errors:
 * if the source repo cannot be reached, keep the committed or previously
 * generated content; if fetched content violates the contract, fail the build.
 *
 * Both halves of that content are committed: app/data/journal.generated.ts and
 * the media under public/journal/. The fallback verifies that media is present
 * so a fresh checkout can never deploy entries whose images 404.
 */
import {
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  buildEntries,
  copyEntryMedia,
  resolveJournalBuild,
  writeGeneratedFile,
} from "./journal-contract.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GENERATED_FILE = path.join(ROOT, "app/data/journal.generated.ts");
const PUBLIC_JOURNAL_DIR = path.join(ROOT, "public/journal");
const SKETCHBOOK_OWNER = "MLDuke";
const SKETCHBOOK_REPO = "sketchbook";
const SKETCHBOOK_BRANCH = "main";
const TARBALL_URL =
  process.env.SKETCHBOOK_TARBALL_URL ??
  `https://codeload.github.com/${SKETCHBOOK_OWNER}/${SKETCHBOOK_REPO}/tar.gz/refs/heads/${SKETCHBOOK_BRANCH}`;
const SOURCE_BLOB_BASE =
  process.env.SKETCHBOOK_SOURCE_BLOB_BASE ??
  `https://github.com/${SKETCHBOOK_OWNER}/${SKETCHBOOK_REPO}/blob/${SKETCHBOOK_BRANCH}`;

class SourceUnavailableError extends Error {}

async function main() {
  const workDir = mkdtempSync(path.join(tmpdir(), "portfolio-journal-"));

  try {
    const outcome = resolveJournalBuild({
      generatedFile: GENERATED_FILE,
      root: ROOT,
      ...(await loadSource(workDir)),
    });

    if (outcome.action === "keep") {
      console.warn(
        `${outcome.reason}; keeping existing ${path.relative(ROOT, GENERATED_FILE)}`,
      );
      return;
    }

    const entries = buildEntries(outcome.sourceRoot, {
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
  } finally {
    rmSync(workDir, { force: true, recursive: true });
  }
}

/** Reachability is an I/O concern; what to do about it is not. */
async function loadSource(workDir) {
  try {
    return { sourceRoot: await fetchSource(workDir) };
  } catch (error) {
    if (error instanceof SourceUnavailableError) {
      return { unavailableReason: error.message };
    }

    throw error;
  }
}

async function fetchSource(workDir) {
  const tarballPath = path.join(workDir, "sketchbook.tar.gz");
  let response;

  try {
    response = await fetch(TARBALL_URL);
  } catch (error) {
    throw new SourceUnavailableError(
      `Unable to fetch sketchbook tarball: ${error.message}`,
    );
  }

  if (!response.ok) {
    throw new SourceUnavailableError(
      `Unable to fetch sketchbook tarball: HTTP ${response.status}`,
    );
  }

  writeFileSync(tarballPath, Buffer.from(await response.arrayBuffer()));

  try {
    execFileSync("tar", ["-xzf", tarballPath, "-C", workDir], {
      stdio: "pipe",
    });
  } catch (error) {
    throw new SourceUnavailableError(
      `Unable to extract sketchbook tarball: ${error.message}`,
    );
  }

  const extractedRoot = readdirSync(workDir)
    .map((entry) => path.join(workDir, entry))
    .find((entryPath) => statSync(entryPath).isDirectory());

  if (!extractedRoot) {
    throw new SourceUnavailableError("Sketchbook tarball was empty");
  }

  return extractedRoot;
}

main();
