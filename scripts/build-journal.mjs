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
import matter from "gray-matter";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

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
    const sourceRoot = await fetchSource(workDir);
    const entries = buildEntries(sourceRoot);

    rmSync(PUBLIC_JOURNAL_DIR, { force: true, recursive: true });
    for (const entry of entries) {
      copyEntryMedia(entry);
    }

    writeGeneratedFile(entries);
    console.log(`journal.generated.ts written - ${entries.length} entries`);
  } catch (error) {
    if (error instanceof SourceUnavailableError && existsSync(GENERATED_FILE)) {
      const missing = missingGeneratedMedia();

      if (missing.length > 0) {
        throw new Error(
          `${error.message}; cannot keep the existing journal data because its media is missing: ${missing.join(", ")}`,
        );
      }

      console.warn(
        `${error.message}; keeping existing ${path.relative(ROOT, GENERATED_FILE)}`,
      );
      return;
    }

    throw error;
  } finally {
    rmSync(workDir, { force: true, recursive: true });
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

function buildEntries(sourceRoot) {
  const entriesDir = path.join(sourceRoot, "entries");

  if (!existsSync(entriesDir)) {
    console.warn("Sketchbook has no entries/ directory; writing an empty journal.");

    return [];
  }

  const published = readdirSync(entriesDir)
    .map((entryFolder) => readEntry(entriesDir, entryFolder))
    .filter((entry) => entry.frontmatter.publish === true)
    .sort((a, b) => {
      const dateCompare = sortKey(b.frontmatter.date).localeCompare(
        sortKey(a.frontmatter.date),
      );

      return (
        dateCompare ||
        sortKey(a.frontmatter.slug).localeCompare(sortKey(b.frontmatter.slug))
      );
    });

  return published.map((entry, index) => toJournalEntry(entry, index));
}

function readEntry(entriesDir, entryFolder) {
  const entryDir = path.join(entriesDir, entryFolder);
  const markdownPath = path.join(entryDir, "index.md");

  if (!statSync(entryDir).isDirectory() || !existsSync(markdownPath)) {
    return {
      frontmatter: { publish: false },
    };
  }

  const parsed = matter(readFileSync(markdownPath, "utf8"));

  return {
    body: parsed.content.trim(),
    entryDir,
    entryFolder,
    frontmatter: { ...parsed.data, date: normalizeDate(parsed.data.date) },
  };
}

function toJournalEntry(entry, position) {
  const { body, entryDir, entryFolder, frontmatter } = entry;
  const title = requireString(frontmatter.title, `${entryFolder}: title`);
  const description = requireString(
    frontmatter.description,
    `${entryFolder}: description`,
  );
  const date = requireString(frontmatter.date, `${entryFolder}: date`);
  const slug = requireString(frontmatter.slug, `${entryFolder}: slug`);
  const type = requireString(frontmatter.type, `${entryFolder}: type`);
  const mediaItems = Array.isArray(frontmatter.media) ? frontmatter.media : [];

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`${entryFolder}: date must be YYYY-MM-DD.`);
  }

  if (!["image", "code", "mixed"].includes(type)) {
    throw new Error(`${entryFolder}: type must be image, code, or mixed.`);
  }

  const mediaBlocks = mediaItems.map((media, mediaIndex) =>
    toFigureBlock(entryDir, slug, media, mediaIndex),
  );
  const firstMedia = mediaBlocks[0]?.media;
  const blocks = [
    {
      type: "description",
      title,
      index: formatIndex(position),
      body,
    },
    ...mediaBlocks,
  ];

  if (type === "code" || type === "mixed") {
    blocks.push(toSourceLinkBlock(entryDir, entryFolder, frontmatter.sourcePath));
  }

  return {
    sourceMedia: mediaItems,
    sourceDir: entryDir,
    slug,
    title,
    index: formatIndex(position),
    description,
    ...(firstMedia ? { cardMedia: firstMedia } : {}),
    blocks,
  };
}

function toFigureBlock(entryDir, slug, media, mediaIndex) {
  const src = requireString(media?.src, `${slug}: media[${mediaIndex}].src`);
  const alt = requireString(media?.alt, `${slug}: media[${mediaIndex}].alt`);
  const source = resolveRelativePath(entryDir, src, `${slug}: media src`);

  if (!existsSync(source) || !statSync(source).isFile()) {
    throw new Error(`${slug}: media file does not exist: ${src}`);
  }

  return {
    type: "figure",
    media: {
      src: `/journal/${slug}/${toPublicPath(src)}`,
      alt,
      ...(media.caption ? { caption: String(media.caption) } : {}),
    },
    ...(media.caption ? { showCaption: true } : {}),
  };
}

function toSourceLinkBlock(entryDir, entryFolder, sourcePath) {
  const relativeSourcePath = requireString(
    sourcePath,
    `${entryFolder}: sourcePath`,
  );
  const sourceDir = resolveRelativePath(
    entryDir,
    relativeSourcePath,
    `${entryFolder}: sourcePath`,
  );

  if (!existsSync(sourceDir) || !statSync(sourceDir).isDirectory()) {
    throw new Error(`${entryFolder}: sourcePath must resolve to a directory.`);
  }

  const readme = readdirSync(sourceDir).find((entry) =>
    /^readme\.md$/i.test(entry),
  );

  if (!readme) {
    throw new Error(`${entryFolder}: sourcePath must contain a README.md.`);
  }

  return {
    type: "sourceLink",
    href: [
      SOURCE_BLOB_BASE,
      "entries",
      encodePath(entryFolder),
      encodePath(toPublicPath(relativeSourcePath)),
      encodePath(readme),
    ]
      .filter(Boolean)
      .join("/"),
    label: "Source README",
  };
}

function copyEntryMedia(entry) {
  for (const media of entry.sourceMedia) {
    const relativeSrc = toPublicPath(media.src);
    const source = resolveRelativePath(
      entry.sourceDir,
      media.src,
      `${entry.slug}: media src`,
    );
    const destination = path.join(PUBLIC_JOURNAL_DIR, entry.slug, relativeSrc);

    mkdirSync(path.dirname(destination), { recursive: true });
    cpSync(source, destination, {
      force: true,
      recursive: false,
    });
  }

  delete entry.sourceMedia;
  delete entry.sourceDir;
}

function writeGeneratedFile(entries) {
  const generated = `import type { JournalEntry } from "./portfolio";

/**
 * GENERATED by scripts/build-journal.mjs. Do not edit by hand.
 *
 * Source: ${SOURCE_BLOB_BASE}
 */
export const journalEntries: JournalEntry[] = ${JSON.stringify(entries, null, 2)};
`;

  writeFileSync(GENERATED_FILE, generated);
}

function missingGeneratedMedia() {
  const generated = readFileSync(GENERATED_FILE, "utf8");

  const referenced = new Set(
    [...generated.matchAll(/"src": "(\/journal\/[^"]+)"/g)].map(
      (match) => match[1],
    ),
  );

  return [...referenced].filter(
    (src) => !existsSync(path.join(ROOT, "public", src)),
  );
}

/**
 * YAML parses an unquoted `date: 2026-01-15` into a Date, so put it back into
 * the YYYY-MM-DD string the entry contract asks for before anything reads it.
 */
function normalizeDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  return value;
}

/** Sorting runs before validation, so absent fields must not crash it. */
function sortKey(value) {
  return typeof value === "string" ? value : "";
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
}

function resolveRelativePath(baseDir, relativePath, label) {
  const normalized = toPublicPath(relativePath);

  if (path.isAbsolute(relativePath) || normalized.startsWith("../")) {
    throw new Error(`${label} must be relative and stay within the entry.`);
  }

  const resolved = path.resolve(baseDir, normalized);
  const base = path.resolve(baseDir);

  if (resolved !== base && !resolved.startsWith(`${base}${path.sep}`)) {
    throw new Error(`${label} must stay within the entry.`);
  }

  return resolved;
}

function toPublicPath(value) {
  return String(value).replaceAll("\\", "/").replace(/^\.\/+/, "");
}

function encodePath(value) {
  return toPublicPath(value)
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
}

function formatIndex(position) {
  return String(position + 1).padStart(3, "0");
}

main();
