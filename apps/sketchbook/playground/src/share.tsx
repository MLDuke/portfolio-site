import { createRoot } from "react-dom/client";
// The same styles as the playground (main.tsx), so the entry looks the same.
import "@mlduke/ui/tokens.css";
import "@mlduke/ui/fonts.css";
import "./styles.css";
import { toSketch, type SketchInput } from "./sketch";
import { Stage } from "./Stage";

// A share page: one entry, alone. share-pages.ts generates one module per entry
// that imports only that entry's files and calls this, so a share page's bundle
// never holds another entry. See docs/adr/0018-share-links.md.
export function mountShare(input: SketchInput) {
  createRoot(document.getElementById("root")!).render(
    <div className="app">
      <main className="main">
        <Stage sketch={toSketch(input)} shared />
      </main>
    </div>,
  );
}
