import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv, searchForWorkspaceRoot } from "vite";
import react from "@vitejs/plugin-react";
import { sharePages } from "./share-pages.ts";

// .env is read from apps/sketchbook, one level up from this Vite root.
const appRoot = fileURLToPath(new URL("..", import.meta.url));
const entriesDir = fileURLToPath(new URL("../entries", import.meta.url));

export default defineConfig(({ command, mode }) => {
  const dev = command === "serve";
  // process.env wins so Vercel / inline `ENABLE_X=true npm run build:playground`
  // override an apps/sketchbook .env used for local testing.
  const env = { ...loadEnv(mode, appRoot, ""), ...process.env };
  const overlayOn = (name: string) => dev || env[name] === "true";

  // `vite build --mode share` is the second half of build:playground: one page
  // per entry under dist/s/, for share links (share-pages.ts, ADR 0018). It
  // runs after the playground build, which empties dist/ first.
  if (mode === "share") {
    // Vercel sets this at build time to the project's production domain.
    const host = env.VERCEL_PROJECT_PRODUCTION_URL;
    return {
      base: "/s/",
      plugins: [react(), sharePages({ entriesDir, origin: host && `https://${host}` })],
      build: { outDir: "dist/s", emptyOutDir: true, copyPublicDir: false },
    };
  }

  return {
    plugins: [react()],

    // Dev overlays (dialkit dials, agentation toolbar): on in `npm run dev`,
    // off in a build unless the matching env var is set for that deploy. These
    // fold to literal booleans so the disabled overlay's wrapper module — and
    // its package — are dropped from the bundle entirely. See src/devtools.tsx.
    define: {
      __DIALKIT_ENABLED__: JSON.stringify(overlayOn("ENABLE_DIALKIT")),
      __AGENTATION_ENABLED__: JSON.stringify(overlayOn("ENABLE_AGENTATION")),
    },

    server: {
      // Conductor gives each local workspace ten ports and the portfolio dev
      // server takes the first, so the run script passes this one in
      // $SKETCHBOOK_PORT. Fall back to Vite's default when it is unset.
      port: Number(process.env.SKETCHBOOK_PORT) || 5173,
      strictPort: Boolean(process.env.SKETCHBOOK_PORT),
      // The playground is its own Vite root (this folder), but it reads sketch
      // source and notes from ../entries and the Entry module from
      // ../scripts/lib, and @mlduke/ui's fonts live in packages/ui, outside
      // apps/sketchbook. Setting fs.allow replaces Vite's default, so allow the
      // whole monorepo root explicitly.
      fs: { allow: [searchForWorkspaceRoot(process.cwd())] },
    },

    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
  };
});
