#!/usr/bin/env bash
# ==============================================================================
# Ralph Loop — Autonomous Goal-Oriented Execution & Recovery Runner
# ==============================================================================
# Usage:
#   ./ralph_loop.sh run [command] [max_retries]
#   ./ralph_loop.sh status
#   ./ralph_loop.sh step [command]
#   ./ralph_loop.sh stop
#   ./ralph_loop.sh reset
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENGINE_SCRIPT="${SCRIPT_DIR}/scripts/ralph-engine.mjs"

if [ ! -f "${ENGINE_SCRIPT}" ]; then
  echo -e "\033[0;31m[Error] Ralph Engine script not found at ${ENGINE_SCRIPT}\033[0m" >&2
  exit 1
fi

ACTION="${1:-run}"
shift || true

case "${ACTION}" in
  run)
    node "${ENGINE_SCRIPT}" run "$@"
    ;;
  status)
    node "${ENGINE_SCRIPT}" status "$@"
    ;;
  step)
    node "${ENGINE_SCRIPT}" step "$@"
    ;;
  stop)
    node "${ENGINE_SCRIPT}" stop
    ;;
  reset)
    node "${ENGINE_SCRIPT}" reset
    ;;
  *)
    # Treat unlisted arguments as a custom command passed to "run"
    node "${ENGINE_SCRIPT}" run "${ACTION}" "$@"
    ;;
esac

EXIT_CODE=$?
exit ${EXIT_CODE}
