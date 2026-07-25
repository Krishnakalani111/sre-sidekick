#!/bin/sh
# Self-provisions the NL->SQL workflow on every boot, so `docker compose
# --profile n8n up -d` is the only command anyone needs to run: no manual
# "import from file" or "create a Postgres credential" step in the n8n UI.
# Fixed ids in pg-credential.seed.json / nl2sql.workflow.json make this
# idempotent (re-running on restart just upserts the same rows).
set -e

echo "[nl2sql] importing Postgres credential..."
n8n import:credentials --input=/data/pg-credential.seed.json

echo "[nl2sql] importing NL->SQL workflow..."
n8n import:workflow --input=/data/nl2sql.workflow.json

echo "[nl2sql] activating workflow..."
n8n publish:workflow --id=nl2sqlWorkflow01

echo "[nl2sql] starting n8n..."
exec n8n start
