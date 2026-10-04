import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// The playground is its own Vite root (this folder), but it reads sketch source
// and notes from ../entries and the Entry module from ../scripts/lib,
// so the dev server has to be allowed to serve files from the repo root.
const repoRoot = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig(({ command, mode }) => {
  const dev = command === "serve";
  // process.env wins so Vercel / inline `ENABLE_X=true npm run build:playground`
  // override a repo-root .env used for local testing.
  const env = { ...loadEnv(mode, repoRoot, ""), ...process.env };
  const overlayOn = (name: string) => dev || env[name] === "true";

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
      fs: { allow: [repoRoot] },
    },

    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
  };
});
