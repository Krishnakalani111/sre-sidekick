#!/usr/bin/env bash
# Populate a running SigNoz with the Sidekick's Dashboard, saved Query Builder
# view, and Alert — all created THROUGH the SigNoz MCP server.
#
# These live in SigNoz's own database, so a fresh `foundryctl cast` won't have
# them: run this ONCE after SigNoz is up and SIGNOZ_API_KEY is set in .env.
#
#   ./scripts/setup-signoz-features.sh
set -uo pipefail
cd "$(dirname "$0")/.."

echo "→ Dashboard (Checkout / Payments Health)"
pnpm exec tsx scripts/create-dashboard.ts

echo "→ Query Builder saved view (Checkout error spans)"
pnpm exec tsx scripts/create-view.ts

echo "→ Alert (Checkout high 5xx error rate)"
# The alert routes to a notification channel. If none exists yet, create one in
# the SigNoz UI (Settings → Notification Channels) named 'test1', or edit
# scripts/create-alert.ts. This step is allowed to fail without aborting.
pnpm exec tsx scripts/create-alert.ts || echo "  (alert needs a notification channel — see note above)"

echo "Done. Open the SigNoz UI (:8080) → Dashboards / Traces saved views / Alerts."
