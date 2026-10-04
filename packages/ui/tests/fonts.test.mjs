import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

const fontsCss = readFileSync("fonts.css", "utf8");

test("fonts.css and fonts/ list the same woff2 files", () => {
  const referenced = [...fontsCss.matchAll(/url\("\.\/fonts\/([^"]+)"\)/g)]
    .map((match) => match[1])
    .sort();
  const shipped = readdirSync("fonts")
    .filter((name) => name.endsWith(".woff2"))
    .sort();

  assert.deepEqual(referenced, shipped);
});

test("fonts.css sets the variables the font-family tokens read", () => {
  assert.match(fontsCss, /--font-ibm-plex-sans: "IBM Plex Sans";/);
  assert.match(fontsCss, /--font-ibm-plex-mono: "IBM Plex Mono";/);
});

test("the font licence travels with the fonts", () => {
  assert.ok(existsSync("fonts/OFL.txt"));
});
