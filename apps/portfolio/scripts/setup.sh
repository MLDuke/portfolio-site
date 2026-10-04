#!/bin/sh
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

command -v node >/dev/null 2>&1 || fail "Node.js is required. Install Node 20.9.0 or newer."
command -v npm >/dev/null 2>&1 || fail "npm is required. Install npm with Node.js."

node -e '
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 20 || (major === 20 && minor < 9)) {
  console.error(`setup: Node ${process.versions.node} found, but this project requires Node 20.9.0 or newer.`);
  process.exit(1);
}
' || exit 1

if [ -f package-lock.json ]; then
  log "Installing npm dependencies from package-lock.json"
  npm ci
else
  log "Installing npm dependencies"
  npm install
fi

if [ "${CONDUCTOR_IS_LOCAL:-0}" = "1" ] && [ "${SETUP_SKIP_AGENTATION:-0}" != "1" ]; then
  if [ -f .conductor/reap-agentation.sh ]; then
    log "Cleaning up stale local agentation-mcp processes"
    sh .conductor/reap-agentation.sh
  fi

  log "Registering Codex MCP bridge for this workspace"
  npx -y add-mcp "npx -y agentation-mcp server" -a codex -y --gitignore
fi

log "Setup complete"
printf '%s\n' "Run development server: npm run dev"
printf '%s\n' "Run lint: npm run lint"
printf '%s\n' "Run production build: npm run build"
