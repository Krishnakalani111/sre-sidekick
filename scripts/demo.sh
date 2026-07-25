#!/usr/bin/env bash
# ============================================================================
# ONE command to run the whole demo: generate REAL incidents, then produce
# real RCAs that land in Slack + the dashboard.
#
#   ./scripts/demo.sh
#
# Prereqs (already running for the judges / recording):
#   - SigNoz + MCP up (foundryctl cast) ; app up (docker compose ... up -d)
#   - repo-root .env has SIGNOZ_API_KEY + GEMINI_API_KEY (+ SLACK_* for Slack)
# ============================================================================
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEMO="${OTEL_DEMO_DIR:-$HOME/otel-demo}"
BACKEND="${BACKEND_URL:-http://localhost:3000}"
N8N="${N8N_URL:-http://localhost:5680}"

say() { printf "\n\033[1;36m==> %s\033[0m\n" "$1"; }

say "1/4  otel-demo incident: checkout → payments failures (worker-pool saturation)"
if ! lsof -ti tcp:5002 >/dev/null 2>&1; then
  ( cd "$DEMO" && INCIDENT=1 OTEL_SERVICE_NAME=payments node --import ./tracing.js payments.js >/tmp/otel-payments.log 2>&1 & )
  ( cd "$DEMO" && OTEL_SERVICE_NAME=checkout node --import ./tracing.js checkout.js >/tmp/otel-checkout.log 2>&1 & )
  sleep 4
fi
curl -s -XPOST http://localhost:5002/admin/incident -H content-type:application/json -d '{"on":true}' >/dev/null 2>&1
( cd "$DEMO" && pkill -f load.js 2>/dev/null; node load.js 120 6 >/tmp/otel-load.log 2>&1 & )
echo "    incident ON, traffic flowing (checkout 5xx climbing)"

say "2/4  n8n workflow failures (a node crashes on every run)"
CK="$(mktemp)"; WFF="$(mktemp)"; RUNF="$(mktemp)"
# owner login (created during setup: kk@local.test / Sidekick123)
curl -s -c "$CK" -XPOST "$N8N/rest/login" -H content-type:application/json \
  -d '{"emailOrLdapLoginId":"kk@local.test","password":"Sidekick123"}' >/dev/null 2>&1
cat > "$WFF" <<'JSON'
{"name":"demo-fail","nodes":[{"parameters":{},"id":"d0000000-0000-0000-0000-000000000001","name":"Trigger","type":"n8n-nodes-base.manualTrigger","typeVersion":1,"position":[0,0]},{"parameters":{"jsCode":"throw new Error('payment node crashed - connection refused to payments-api');"},"id":"d0000000-0000-0000-0000-000000000002","name":"Boom","type":"n8n-nodes-base.code","typeVersion":2,"position":[220,0]}],"connections":{"Trigger":{"main":[[{"node":"Boom","type":"main","index":0}]]}},"settings":{}}
JSON
WID="$(curl -s -b "$CK" -XPOST "$N8N/rest/workflows" -H content-type:application/json --data @"$WFF" | python3 -c "import sys,json;print(json.load(sys.stdin).get('data',{}).get('id',''))" 2>/dev/null)"
if [ -n "${WID:-}" ]; then
  python3 -c "import json;wf=json.load(open('$WFF'));json.dump({'workflowData':wf,'triggerToStartFrom':{'name':'Trigger'}},open('$RUNF','w'))"
  for i in $(seq 1 8); do curl -s -b "$CK" -XPOST "$N8N/rest/workflows/$WID/run" -H content-type:application/json --data @"$RUNF" -o /dev/null; done
  echo "    8 failing n8n runs fired (error spans → SigNoz)"
else
  echo "    (skipped n8n — could not authenticate; run failing workflows from the n8n UI)"
fi
rm -f "$CK" "$WFF" "$RUNF"

say "3/4  let telemetry land in SigNoz"; sleep 25

say "4/4  investigate → real RCA → Slack + dashboard"
curl -s --max-time 200 -XPOST "$BACKEND/webhook/alert" -H content-type:application/json \
  --data @"$ROOT/scripts/alerts/high-error-rate.json" \
  | python3 -c "import sys,json;d=json.load(sys.stdin);g=d.get('diagnosis',{});print('    checkout RCA:',g.get('title'),'| conf',g.get('confidence'),'| slack',bool(d.get('slack')))" 2>/dev/null
curl -s --max-time 200 -XPOST "$BACKEND/webhook/alert" -H content-type:application/json \
  -d '{"name":"n8n workflow failures","service":"n8n","severity":"critical","source":"signoz"}' \
  | python3 -c "import sys,json;d=json.load(sys.stdin);g=d.get('diagnosis',{});print('    n8n RCA:     ',g.get('title'),'| conf',g.get('confidence'),'| slack',bool(d.get('slack')))" 2>/dev/null

echo ""
echo "Done. Open Slack channel + dashboard http://localhost:5173  (SigNoz http://localhost:8080)"
