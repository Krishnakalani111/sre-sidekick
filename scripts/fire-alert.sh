#!/usr/bin/env bash
# Fire an alert at the Sidekick backend and pretty-print the Diagnosis.
# Usage: scripts/fire-alert.sh [payload.json]   (defaults to alerts/high-error-rate.json)
set -euo pipefail

BACKEND="${BACKEND_URL:-http://localhost:3000}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PAYLOAD="${1:-$HERE/alerts/high-error-rate.json}"

echo "→ POST $BACKEND/webhook/alert  (payload: $(basename "$PAYLOAD"))"
curl -sS -XPOST "$BACKEND/webhook/alert" \
  -H 'content-type: application/json' \
  --data @"$PAYLOAD" | (jq . 2>/dev/null || cat)
