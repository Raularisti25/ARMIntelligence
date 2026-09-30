#!/usr/bin/env bash
set -euo pipefail

# Portable bootstrap extracted from ARM's Raspberry Pi wake path.
# Keep machine-specific secrets and credentials OUT of this file.

ROOT="${ARM_INTELLIGENCE_ROOT:-$HOME/ARMIntelligence}"
NODE_BIN="${ARM_LAB_NODE_BIN:-$(command -v node || true)}"

if [[ -z "$NODE_BIN" || ! -x "$NODE_BIN" ]]; then
  echo "pi-wake: node executable not found; set ARM_LAB_NODE_BIN" >&2
  exit 127
fi

cd "$ROOT"
exec "$NODE_BIN" "$ROOT/lab/pi-wake/wake-loop.mjs"
