// Keeps @mlduke/ui token variables out of the sketch stage.
//
// Custom properties inherit, so once tokens.css is on :root every sketch could
// write `var(--color-neutral-3)` and have it work in the playground, then break
// when lifted out. The sketch contract says sketches are self-contained, so this
// unsets every variable the package declares inside `.canvas`. `initial` makes
// a custom property the guaranteed-invalid value, so `var(--x)` is invalid and
// `var(--x, fallback)` takes its fallback, exactly as if the token didn't exist.
//
// The names are read from the package's own CSS at build time (`?raw`), so a
// token added in a later tag is covered without touching this file.
import tokensCss from "@mlduke/ui/tokens.css?raw";
import fontsCss from "@mlduke/ui/fonts.css?raw";

const STAGE_SELECTOR = ".canvas";

/** Every custom property name declared in the given CSS, in first-seen order. */
export function declaredVariables(...sources: string[]): string[] {
  const names = new Set<string>();
  for (const source of sources) {
    for (const match of source.matchAll(/(--[\w-]+)\s*:/g)) names.add(match[1]);
  }
  return [...names];
}

export function stageIsolationCss(...sources: string[]): string {
  const resets = declaredVariables(...sources).map((name) => `${name}:initial`);
  return `${STAGE_SELECTOR}{${resets.join(";")}}`;
}

const style = document.createElement("style");
style.dataset.stageIsolation = "";
style.textContent = stageIsolationCss(tokensCss, fontsCss);
document.head.append(style);
