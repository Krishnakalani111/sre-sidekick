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

echo "→ Alerts (checkout 5xx + n8n workflow failures)"
# Alerts route to a notification channel. If none exists, create one in the
# SigNoz UI (Settings → Notification Channels) named 'test1' with a WEBHOOK URL
# of http://host.docker.internal:3000/webhook/alert (so a firing alert auto-
# triggers an investigation → Slack RCA). These steps may fail without a channel.
pnpm exec tsx scripts/create-alert.ts     || echo "  (checkout alert needs the 'test1' channel — see note)"
pnpm exec tsx scripts/create-alert-n8n.ts || echo "  (n8n alert needs the 'test1' channel — see note)"

echo "Done. Open the SigNoz UI (:8080) → Dashboards / Traces saved views / Alerts."
