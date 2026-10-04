#!/bin/sh
# Conductor workspace setup. Works from any directory; it cds to the repo root.
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repo_root=$(CDPATH= cd -- "$script_dir/.." && pwd)

cd "$repo_root"

log() {
  printf '%s\n' "==> $*"
}

fail() {
  printf '%s\n' "setup: $*" >&2
  exit 1
}

command -v node >/dev/null 2>&1 || fail "Node.js is required. Install Node 22.18 or newer."
command -v npm >/dev/null 2>&1 || fail "npm is required. Install npm with Node.js."

# Keep in step with "engines" in the root package.json.
node -e '
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 22 || (major === 22 && minor < 18)) {
  console.error(`setup: Node ${process.versions.node} found, but this repo requires Node 22.18 or newer.`);
  process.exit(1);
}
' || exit 1

log "Installing npm dependencies from package-lock.json"
npm ci

if [ "${CONDUCTOR_IS_LOCAL:-0}" = "1" ] && [ "${SETUP_SKIP_AGENTATION:-0}" != "1" ]; then
  log "Cleaning up stale local agentation-mcp processes"
  sh scripts/reap-agentation.sh

  log "Registering Codex MCP bridge for this workspace"
  # .gitignore already covers .codex/config.toml, so no --gitignore here.
  npx -y add-mcp "npx -y agentation-mcp server" -a codex -y
fi

log "Setup complete"
printf '%s\n' "Portfolio dev server:  npm run dev:portfolio"
printf '%s\n' "Sketchbook playground: npm run dev:sketchbook"
printf '%s\n' "Tests:                 npm test"
