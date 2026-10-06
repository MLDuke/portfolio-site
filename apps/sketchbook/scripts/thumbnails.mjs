#!/usr/bin/env node
// Screenshots each sketch's stage into entries/<dir>/thumbnail.png, the card the
// playground index shows. Starts the playground's own Vite server with the dev
// overlays off, so the dial panel can't land in the shot, and drives it with a
// headless Chromium. Local only: nothing in CI or a deploy runs this.
//
//   npm run thumbnails                       every code/mixed entry with a sketch
//   npm run thumbnails -- 2026-10-03-dot-raster [more dirs…]
//   npm run thumbnails -- --wait 3000 <dir>  for a sketch with a long intro
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { THUMBNAIL_FILE, typeNeedsSource } from "./lib/entry.mjs";
import { checkEntryDir } from "./validate-entries.mjs";

const APP_DIR = fileURLToPath(new URL("..", import.meta.url));
const ENTRIES_DIR = path.join(APP_DIR, "entries");
const PLAYGROUND_DIR = path.join(APP_DIR, "playground");

const USAGE = "usage: npm run thumbnails -- [--wait <ms>] [<entry dir>…]";
// How long a sketch runs before the shot. Long enough for springs and intro
// animations to settle; seeded sketches then land on much the same frame.
const DEFAULT_WAIT_MS = 1500;
// The stage is as wide as the viewport less the page padding, so this sets the
// thumbnail's width: roughly 2x a card on a retina screen.
const VIEWPORT = { width: 1024, height: 768 };

/** The entries to shoot: the named ones, or every one with a sketch to render. */
async function pickEntries(names) {
  const all = readdirSync(ENTRIES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const picked = [];
  const refused = [];
  for (const dir of names.length > 0 ? names : all) {
    if (!all.includes(dir)) {
      refused.push(`${dir}: no such entry in entries/`);
      continue;
    }
    const { entry } = await checkEntryDir(ENTRIES_DIR, dir);
    if (typeNeedsSource(entry.type) && entry.sourceFile) picked.push(dir);
    else if (names.length > 0) refused.push(`${dir}: not a code or mixed entry with a sketch to render`);
  }
  return { picked, refused };
}

async function startPlayground() {
  const { createServer } = await import("vite");
  const server = await createServer({
    root: PLAYGROUND_DIR,
    configFile: path.join(PLAYGROUND_DIR, "vite.config.ts"),
    // The script reports each failure itself; Vite would echo the page's
    // console on top of it.
    logLevel: "silent",
    // Any free port, so this runs beside a dev server already on $SKETCHBOOK_PORT.
    server: { port: 0, strictPort: false },
    // Inline config wins over the file's: overlays off, as in a default build.
    define: { __DIALKIT_ENABLED__: "false", __AGENTATION_ENABLED__: "false" },
  });
  await server.listen();
  return { server, url: server.resolvedUrls.local[0] };
}

async function launchBrowser() {
  const { chromium } = await import("playwright");
  try {
    return await chromium.launch();
  } catch (err) {
    if (/Executable doesn't exist/.test(String(err))) {
      throw new Error("Chromium isn't installed for Playwright — run `npx playwright install chromium` once, then retry.");
    }
    throw err;
  }
}

/** Renders one entry's stage and saves it; returns an error message or null. */
async function shoot(browser, url, dir, waitMs) {
  const page = await browser.newPage({ viewport: VIEWPORT });
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  try {
    await page.goto(`${url}#/${encodeURIComponent(dir)}`);
    const canvas = page.locator(".canvas");
    await canvas.waitFor({ state: "visible", timeout: 15_000 });
    await page.locator(".canvas__loading").waitFor({ state: "detached", timeout: 15_000 });
    await page.waitForTimeout(waitMs);
    // SketchBoundary swaps the sketch for its stack trace when it throws.
    if ((await canvas.locator(".panel--error").count()) > 0 || pageErrors.length > 0) {
      const detail = pageErrors[0] ?? (await canvas.locator(".panel--error").innerText()).split("\n")[0];
      return `the sketch threw: ${detail}`;
    }
    await canvas.screenshot({ path: path.join(ENTRIES_DIR, dir, THUMBNAIL_FILE) });
    return null;
  } catch (err) {
    return String(err instanceof Error ? err.message : err).split("\n")[0];
  } finally {
    await page.close();
  }
}

async function main() {
  let args;
  try {
    args = parseArgs({ allowPositionals: true, options: { wait: { type: "string" } } });
  } catch (err) {
    console.error(`${err.message}\n${USAGE}`);
    process.exitCode = 1;
    return;
  }
  const waitMs = args.values.wait === undefined ? DEFAULT_WAIT_MS : Number(args.values.wait);
  if (!Number.isFinite(waitMs) || waitMs < 0) {
    console.error(`--wait must be a number of milliseconds\n${USAGE}`);
    process.exitCode = 1;
    return;
  }
  if (!existsSync(ENTRIES_DIR)) {
    console.log("No entries/ directory — nothing to shoot.");
    return;
  }

  const { picked, refused } = await pickEntries(args.positionals);
  for (const line of refused) console.error(`  ${line}`);
  if (refused.length > 0) process.exitCode = 1;
  if (picked.length === 0) {
    if (refused.length === 0) console.log("No code or mixed entries with a sketch — nothing to shoot.");
    return;
  }

  const { server, url } = await startPlayground();
  let browser;
  try {
    browser = await launchBrowser();
    for (const dir of picked) {
      const failure = await shoot(browser, url, dir, waitMs);
      if (failure) {
        console.error(`  ${dir}: ${failure}`);
        process.exitCode = 1;
      } else {
        console.log(`  ${path.join("entries", dir, THUMBNAIL_FILE)}`);
      }
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  } finally {
    await browser?.close();
    await server.close();
  }
}

main();
