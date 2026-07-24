# Dashboard API — Investigation history (issue → RCA → accuracy)

For the dashboard **table**: every detected issue, the RCA we produced, and
whether that RCA was accurate. Persisted in **dockerized Postgres**
(`docker compose up -d` at repo root; backend reads `DATABASE_URL`).

Base URL: `http://localhost:3000` (set via `BACKEND_PORT`). All JSON.

Rows are written automatically whenever an investigation runs — via
`POST /webhook/alert` (issue = alert name) or `POST /investigate` (issue = the
question). The three endpoints below are what the dashboard needs.

---

### 1. LIST — `GET /investigations`
Newest first. Query params (all optional):
`limit` (default 50, max 200), `offset` (default 0), `accuracy` (`accurate` | `inaccurate` | `unverified`).

```bash
curl "http://localhost:3000/investigations?limit=20&accuracy=unverified"
```
```jsonc
{
  "total": 42,          // total matching rows (for pagination)
  "limit": 20, "offset": 0,
  "items": [
    {
      "id": "d0e132e1-…",           // use for GET detail / PATCH feedback
      "createdAt": "2026-07-24T14:07:…Z",
      "source": "signoz",           // signoz | chat | alertmanager | manual
      "issue": "PaymentsLatencyHigh",   // the detected issue (alert name / query)
      "service": "payments",
      "severity": "warning",
      "title": "…",
      "rootCause": "…",
      "confidence": 0.74,           // 0..1  (render as %)
      "evidence": ["…","…"],        // string[]
      "suggestedFix": "…",
      "affectedServices": ["payments"],
      "accuracy": "unverified",     // accurate | inaccurate | unverified
      "feedbackNote": null,
      "feedbackAt": null
    }
  ]
}
```
**Suggested table columns:** Detected (`createdAt`) · Issue (`issue`) · Service · Root cause (`rootCause`) · Confidence · Accuracy (badge) · Actions (👍/👎).

### 2. DETAIL — `GET /investigations/:id`
Full record: everything in the list row **plus** `recommendedActions`, `steps`
(the agent's tool-call trail), and — if the backend still holds it in memory —
`evidenceDetail` (raw traces/logs/metrics). Use for a drill-in / modal.

### 3. FEEDBACK — `PATCH /investigations/:id/feedback`
Mark whether the RCA was accurate. This is the 👍 / 👎 action on each row.
```bash
curl -XPATCH http://localhost:3000/investigations/<id>/feedback \
  -H content-type:application/json \
  -d '{"accurate": false, "note": "was actually a bad deploy"}'
```
Body: `{ "accurate": boolean, "note"?: string }`.
Returns the updated record (`accuracy` becomes `accurate`/`inaccurate`, `feedbackAt` set).
`404` if the id doesn't exist; `400` if `accurate` isn't a boolean.

---

**CORS:** if the dashboard is served from another origin, tell me and I'll add
`cors()` to the backend. **Empty list?** run an investigation first (`./scripts/fire-alert.sh`
or `@mention` the Slack bot) and make sure `docker compose up -d` (Postgres) is running.
