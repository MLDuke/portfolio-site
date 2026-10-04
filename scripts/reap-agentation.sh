#!/bin/sh
# Reap stale agentation-mcp server processes shared across Conductor workspaces.
#
# Keep the process that owns the shared toolbar bridge and any process that
# still has a live parent session. Kill only orphaned agentation-mcp processes.
WINNER=$(lsof -tiTCP:4747 -sTCP:LISTEN 2>/dev/null)
WINNER_PARENT=$(ps -o ppid= -p "$WINNER" 2>/dev/null | tr -d ' ')

for pid in $(pgrep -f "agentation-mcp server" 2>/dev/null); do
  [ "$pid" = "$WINNER" ] && continue
  [ "$pid" = "$WINNER_PARENT" ] && continue

  ppid=$(ps -o ppid= -p "$pid" 2>/dev/null | tr -d ' ')
  [ "$ppid" = "1" ] && kill "$pid" 2>/dev/null
done
