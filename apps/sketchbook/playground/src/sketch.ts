import type { ComponentType } from "react";
import {
  readEntry,
  type Entry,
  type EntryFile,
  type EntryMedia,
  type Problem,
} from "../../scripts/lib/entry.mjs";

export interface SketchMedia extends EntryMedia {
  /** Resolved bundler URL, present only when the file exists on disk. */
  url?: string;
}

/**
 * An Entry as the Entry module read it (nothing defaulted: an invalid entry has
 * empty fields and `problems` says why), plus what the playground adds.
 */
export interface Sketch extends Omit<Entry, "media"> {
  media: SketchMedia[];
  /** Resolved bundler URL of the entry's thumbnail, when it has one. */
  thumbnailUrl?: string;
  /** Everything wrong with the entry, as judged by the Entry module. */
  problems: Problem[];
  /**
   * Dynamic import of the sketch's `src/index.*`, or undefined when the entry
   * has no runnable source yet. Each one is a separate lazy chunk, so a sketch
   * is only fetched and compiled when you open it.
   */
  load?: () => Promise<{ default: ComponentType }>;
}

/** What an adapter gathers for one entry from its bundler imports. */
export interface SketchInput {
  dir: string;
  indexMd: string;
  /** The entry folder as far as the adapter can see it (`partial`). */
  files: EntryFile[];
  /** Bundler URL for a file in the entry folder, by its path there. */
  urlFor: (path: string) => string | undefined;
  /** Dynamic import of a source file in the entry folder, by its path there. */
  loaderFor: (path: string) => Sketch["load"];
}

// One entry's worth of the playground's adapter: free of globs, so a share page
// (share-pages.ts) can build its one Sketch without bundling every other entry.
export function toSketch({ dir, indexMd, files, urlFor, loaderFor }: SketchInput): Sketch {
  const { entry, problems } = readEntry({ dir, indexMd, files, partial: true });
  return {
    ...entry,
    media: entry.media.map((m) => ({ ...m, url: m.src ? urlFor(m.src) : undefined })),
    thumbnailUrl: entry.thumbnail ? urlFor(entry.thumbnail) : undefined,
    problems,
    load: entry.sourceFile ? loaderFor(entry.sourceFile) : undefined,
  };
}
