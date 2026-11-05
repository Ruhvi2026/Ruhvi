#!/usr/bin/env bash
# ==============================================================================
# GSD (Get Shit Done) Automation Runner
# Strict State Progression: PLAN -> EXECUTE -> VERIFY
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENGINE_SCRIPT="${SCRIPT_DIR}/scripts/gsd-engine.mjs"

if [ ! -f "${ENGINE_SCRIPT}" ]; then
  echo "Error: GSD engine not found at ${ENGINE_SCRIPT}" >&2
  exit 1
fi

ACTION="${1:-status}"
TASK_ID="${2:-}"
EXTRA_ARG="${3:-}"

echo -e "\033[0;36m>>> [GSD Runner] Executing: node scripts/gsd-engine.mjs ${ACTION} ${TASK_ID} ${EXTRA_ARG}\033[0m"

if [ -n "${EXTRA_ARG}" ]; then
  node "${ENGINE_SCRIPT}" "${ACTION}" "${TASK_ID}" "${EXTRA_ARG}"
elif [ -n "${TASK_ID}" ]; then
  node "${ENGINE_SCRIPT}" "${ACTION}" "${TASK_ID}"
else
  node "${ENGINE_SCRIPT}" "${ACTION}"
fi

EXIT_CODE=$?
if [ ${EXIT_CODE} -ne 0 ]; then
  echo -e "\033[0;31m>>> [GSD Runner] Task action failed with exit code ${EXIT_CODE}\033[0m" >&2
  exit ${EXIT_CODE}
fi

echo -e "\033[0;32m>>> [GSD Runner] Completed successfully.\033[0m"

