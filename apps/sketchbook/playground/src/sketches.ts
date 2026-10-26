import type { ComponentType } from "react";
import type { EntryFile } from "../../scripts/lib/entry.mjs";
import { toSketch, type Sketch } from "./sketch";

export type { Sketch, SketchMedia } from "./sketch";

// Notes and media are cheap and needed up front for the index, so eager. Sketch
// modules stay lazy — that is what keeps startup flat as the collection grows.
// Keep all three globs literal (Vite analyses them statically), and in agreement
// with MEDIA_EXTENSIONS / SOURCE_EXTENSIONS in entry.mjs; entry.test.mjs fails
// if they drift.
const noteFiles = import.meta.glob("../../entries/*/index.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const mediaFiles = import.meta.glob(
  "../../entries/*/*.{png,gif,jpg,jpeg,webp,avif,svg}",
  { query: "?url", import: "default", eager: true },
) as Record<string, string>;

const sketchModules = import.meta.glob(
  "../../entries/*/src/index.{jsx,tsx,js,ts}",
) as Record<string, () => Promise<{ default: ComponentType }>>;

const DIR_RE = /\/entries\/([^/]+)\/(.+)$/;

// The browser can't list a folder or stat a file, so each entry's file listing
// is rebuilt from what the globs matched. That's a partial listing without
// sizes, which the Entry module is told about (`partial`), so it skips the
// checks that need either.
function filesByDir(...globs: Record<string, unknown>[]): Map<string, EntryFile[]> {
  const byDir = new Map<string, EntryFile[]>();
  for (const key of globs.flatMap(Object.keys)) {
    const match = key.match(DIR_RE);
    if (!match) continue;
    const [, dir, path] = match;
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir)!.push({ path });
  }
  return byDir;
}

const files = filesByDir(noteFiles, mediaFiles, sketchModules);

export const sketches: Sketch[] = Object.entries(noteFiles)
  .map(([globPath, indexMd]): Sketch => {
    const dir = globPath.match(DIR_RE)![1];
    const prefix = `../../entries/${dir}/`;
    return toSketch({
      dir,
      indexMd,
      files: files.get(dir) ?? [],
      urlFor: (path) => mediaFiles[prefix + path],
      loaderFor: (path) => sketchModules[prefix + path],
    });
  })
  .sort((a, b) => b.date.localeCompare(a.date) || a.dir.localeCompare(b.dir));
