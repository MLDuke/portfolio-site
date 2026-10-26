// The share build (`vite build --mode share`): one page per entry at
// /s/<dir>/, each bundling that entry and nothing else, for the password gate
// to let through with a share link. See docs/adr/0018-share-links.md.
//
// The playground's own bundle can't be shared piecemeal: its note and media
// globs are eager (ADR 0002), so every entry's note is in the main chunk and
// every sketch chunk imports it. Here each entry gets a generated module that
// imports only its own files, and its own HTML that loads only that module.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Plugin, Rolldown } from "vite";
import {
  MEDIA_EXTENSIONS,
  SOURCE_EXTENSIONS,
  findSourceFile,
  readEntry,
  type Entry,
} from "../scripts/lib/entry.mjs";

const VIRTUAL = "virtual:share/";
const RESOLVED = `\0${VIRTUAL}`;

interface SharedEntry {
  entry: Entry;
  /** Absolute path of the entry folder. */
  root: string;
  /** What the playground's globs would see of the folder, as entry paths. */
  files: string[];
  /** The file share links unfurl with, if the entry has one to offer. */
  ogImage: string | undefined;
}

/**
 * @param entriesDir absolute path of `entries/`
 * @param origin where the deploy is served, for absolute `og:image` URLs
 *   (unfurlers need them); relative when unset, as in a local build
 */
export function sharePages({ entriesDir, origin }: { entriesDir: string; origin?: string }): Plugin {
  const shareModule = path.resolve(import.meta.dirname, "src/share.tsx");
  const entries = new Map<string, SharedEntry>();
  let base = "/";

  return {
    name: "sketchbook:share-pages",
    apply: "build",

    config() {
      for (const dir of readdirSync(entriesDir)) {
        const shared = readShared(entriesDir, dir);
        if (shared) entries.set(dir, shared);
      }
      return {
        build: {
          rolldownOptions: {
            input: Object.fromEntries([...entries.keys()].map((dir) => [dir, VIRTUAL + dir])),
          },
        },
      };
    },

    configResolved(config) {
      base = config.base;
    },

    resolveId(id) {
      return id.startsWith(VIRTUAL) ? `\0${id}` : undefined;
    },

    load(id) {
      if (!id.startsWith(RESOLVED)) return undefined;
      const shared = entries.get(id.slice(RESOLVED.length));
      return shared && entryModule(shared, shareModule);
    },

    generateBundle(_options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== "chunk" || !chunk.facadeModuleId?.startsWith(RESOLVED)) continue;
        const shared = entries.get(chunk.facadeModuleId.slice(RESOLVED.length));
        if (!shared) continue;
        const { dir } = shared.entry;

        let ogImage: string | undefined;
        if (shared.ogImage) {
          ogImage = `${dir}/og${path.extname(shared.ogImage)}`;
          this.emitFile({
            type: "asset",
            fileName: ogImage,
            source: readFileSync(path.join(shared.root, shared.ogImage)),
          });
        }

        this.emitFile({
          type: "asset",
          fileName: `${dir}/index.html`,
          source: sharePage({
            entry: shared.entry,
            script: base + chunk.fileName,
            styles: [...cssOf(chunk, bundle)].map((file) => base + file),
            ogImage: ogImage && `${origin ?? ""}${base}${ogImage}`,
          }),
        });
      }
    },
  };
}

function readShared(entriesDir: string, dir: string): SharedEntry | undefined {
  const root = path.join(entriesDir, dir);
  const indexPath = path.join(root, "index.md");
  if (!existsSync(indexPath)) return undefined;

  // The same files the playground's three globs match (sketches.ts), so the
  // Entry module sees an entry the same way in both builds.
  const media = new Set(MEDIA_EXTENSIONS.map((ext) => `.${ext}`));
  const files = ["index.md"];
  for (const name of readdirSync(root)) {
    if (media.has(path.extname(name))) files.push(name);
  }
  for (const ext of SOURCE_EXTENSIONS) {
    if (existsSync(path.join(root, "src", `index.${ext}`))) files.push(`src/index.${ext}`);
  }

  const { entry } = readEntry({
    dir,
    indexMd: readFileSync(indexPath, "utf8"),
    files: files.map((file) => ({ path: file })),
    partial: true,
  });
  const ogImage = entry.thumbnail ?? entry.media.find((m) => m.src && files.includes(m.src))?.src;
  return { entry, root, files, ogImage };
}

// The generated module for one entry: its note, its media and its sketch, by
// absolute path, handed to mountShare in share.tsx.
function entryModule({ entry, root, files }: SharedEntry, shareModule: string): string {
  const abs = (file: string) => JSON.stringify(path.join(root, file));
  const media = files.filter((file) => file !== "index.md" && !file.startsWith("src/"));
  const source = findSourceFile(files.map((file) => ({ path: file })));

  return [
    `import { mountShare } from ${JSON.stringify(shareModule)};`,
    `import indexMd from ${JSON.stringify(path.join(root, "index.md") + "?raw")};`,
    ...media.map((file, i) => `import url${i} from ${JSON.stringify(path.join(root, file) + "?url")};`),
    `const urls = { ${media.map((file, i) => `${JSON.stringify(file)}: url${i}`).join(", ")} };`,
    `const loaders = { ${source ? `${JSON.stringify(source)}: () => import(${abs(source)})` : ""} };`,
    `mountShare({`,
    `  dir: ${JSON.stringify(entry.dir)},`,
    `  indexMd,`,
    `  files: ${JSON.stringify(files.map((file) => ({ path: file })))},`,
    `  urlFor: (file) => urls[file],`,
    `  loaderFor: (file) => loaders[file],`,
    `});`,
  ].join("\n");
}

// Every stylesheet an entry chunk needs: its own and those of the chunks it
// imports, which is where the shared shell's CSS ends up.
function cssOf(
  chunk: Rolldown.OutputChunk,
  bundle: Rolldown.OutputBundle,
  seen = new Set<string>(),
): Set<string> {
  const css = new Set<string>(chunk.viteMetadata?.importedCss);
  for (const name of chunk.imports) {
    if (seen.has(name)) continue;
    seen.add(name);
    const imported = bundle[name];
    if (imported?.type === "chunk") for (const file of cssOf(imported, bundle, seen)) css.add(file);
  }
  return css;
}

function sharePage({
  entry,
  script,
  styles,
  ogImage,
}: {
  entry: Entry;
  script: string;
  styles: string[];
  ogImage: string | undefined;
}): string {
  const title = entry.title || entry.dir;
  const meta = (attr: string, key: string, value: string) =>
    `    <meta ${attr}="${key}" content="${escapeHtml(value)}" />`;
  return `<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>${escapeHtml(title)} · sketchbook</title>
${[
  entry.description && meta("name", "description", entry.description),
  meta("property", "og:type", "website"),
  meta("property", "og:site_name", "sketchbook"),
  meta("property", "og:title", title),
  entry.description && meta("property", "og:description", entry.description),
  ogImage && meta("property", "og:image", ogImage),
  meta("name", "twitter:card", ogImage ? "summary_large_image" : "summary"),
  ...styles.map((href) => `    <link rel="stylesheet" href="${escapeHtml(href)}" />`),
  `    <script type="module" src="${escapeHtml(script)}"></script>`,
]
  .filter(Boolean)
  .join("\n")}
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
