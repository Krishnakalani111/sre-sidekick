# Chaos & Traffic Generator (n8n) — AI SRE Sidekick

The n8n workflow that drives the traffic/chaos side of the Sidekick's demo data:
on a schedule it fires bursts of requests picked by scenario weight, and it
exposes a webhook to start/stop a sustained "incident" (a fault that stays on
long enough to actually breach an SLO).

This package only contains the n8n side. It does not ship traffic-target
services or a telemetry backend — bring your own and point the workflow's
`Run Agent` node at it after import.

## Setup

```bash
docker compose up -d
```

Open n8n at http://localhost:5678 or http://localhost:5679 → **Import from File** →
`n8n/traffic-and-chaos.workflow.json` → **Activate** it.

> The workflow must be **Active**, not run manually. Incident state lives in
> n8n workflow static data, which only persists across production executions.

## Workflow nodes

```
Every 20s  (schedule trigger)
  └─ Pick Scenarios       chooses a scenario by weight, bundles a burst
       └─ Run Agent       POST http://agent-gateway:8080/agent/run  (bring your own target)

Chaos Webhook  (POST /webhook/chaos)
  └─ Set Incident         reads/writes incident state in workflow static data
       └─ Respond
```

`Run Agent` currently points at `http://agent-gateway:8080/agent/run` — update
the URL to whatever service you want the generated traffic to hit.

## Two modes

**Baseline** runs on its own: every 20s it fires a burst of 3–8 requests and
picks a scenario by weight. This is the "normal" your RCA compares against.

**Sustained incidents** are what actually breach an SLO. A single failed
request never trips a threshold, so inject a fault that stays on:

```bash
curl -X POST http://localhost:5679/webhook/chaos \
  -H 'content-type: application/json' \
  -d '{"scenario_id":"db_pool_exhausted","duration_s":300,"blast_radius":0.7}'

curl -X POST http://localhost:5679/webhook/chaos -d '{"action":"status"}'
curl -X POST http://localhost:5679/webhook/chaos -d '{"action":"clear"}'
```

## Tuning

- Traffic volume → `secondsInterval` on the **Every 20s** node, or the burst
  size in **Pick Scenarios**.
- Scenario frequency → the `weight` values in the `CATALOG` array inside the
  **Pick Scenarios** code node (that's the only copy of the catalog in this
  package — there's no external `scenario-catalog.json` here).
