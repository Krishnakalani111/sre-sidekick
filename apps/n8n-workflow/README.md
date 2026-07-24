# NL -> SQL (n8n + real Postgres + Gemini)

Ask a database a question in plain English, get a real answer back — backed
by an actual Postgres instance and an actual LLM call, not a mock. This is
the most common "LLM does real work" pattern there is: text in, SQL out,
query executed, results explained.

```
Ask Webhook  (POST /webhook/nl2sql  { "question": "..." })
  └─ Read Question
       └─ Introspect Schema          live information_schema query - the
       │                             prompt is grounded in the REAL current
       │                             schema, not a hardcoded description
       └─ Build SQL Prompt           schema + question -> LLM instructions
            └─ Generate SQL (Gemini)          <- LLM call #1: writes the SQL
                 └─ Extract Generated SQL     strip markdown fences etc.
                      └─ Guard: Read-Only Only   SELECT/WITH only, no
                      │                          INSERT/UPDATE/DELETE/DROP/
                      │                          ALTER/TRUNCATE, single
                      │                          statement only
                      └─ Safe To Run?
                           ├─ yes → Execute Generated Query   (real Postgres)
                           │           └─ Build Summary Prompt
                           │                └─ Summarize Results (Gemini)   <- LLM call #2: explains the rows
                           │                     └─ Compose Final Answer
                           └─ no  → Blocked Response (shows the blocked SQL, doesn't run it)
                                                        └─ Respond
```

Two LLM calls, two different jobs: the first turns English into SQL, the
second turns raw rows back into English. Nothing about the schema or the
answer is hardcoded — both come from the live database on every request.

## Setup

```bash
cd apps/n8n-workflow
cp .env.example .env        # set GEMINI_API_KEY (free tier: https://aistudio.google.com/apikey)
docker compose up -d        # real Postgres, seeded, + n8n on :5680
```

Open n8n at `http://localhost:5680` → **Import from File** →
`n8n/nl2sql.workflow.json`.

On both Postgres nodes (**Introspect Schema**, **Execute Generated Query**),
select/create a Postgres credential pointing at the compose network:

- Host: `postgres`
- Port: `5432`
- Database: `nl2sql`
- User / Password: `nl2sql` / `nl2sql`

**Activate** the workflow.

## Try it

```bash
curl -X POST http://localhost:5680/webhook/nl2sql -H content-type:application/json \
  -d '{"question":"which customer has spent the most money in total?"}'

curl -X POST http://localhost:5680/webhook/nl2sql -H content-type:application/json \
  -d '{"question":"how many orders were cancelled or refunded?"}'

curl -X POST http://localhost:5680/webhook/nl2sql -H content-type:application/json \
  -d '{"question":"total revenue by product category"}'
```

Each returns:

```json
{
  "ok": true,
  "question": "...",
  "sql": "SELECT ...",
  "rowCount": 3,
  "rows": [ { "...": "..." } ],
  "answer": "Plain-English explanation of the result."
}
```

Try provoking the guard, to see it actually stop something instead of just
existing on paper:

```bash
curl -X POST http://localhost:5680/webhook/nl2sql -H content-type:application/json \
  -d '{"question":"delete all customers from the database"}'
# => { "ok": false, "blockedSql": "...", "reason": "...safety check..." }
```

## Sample dataset

`db/init.sql` seeds four small, related tables so joins and aggregates have
something real to work with: `customers`, `products`, `orders`,
`order_items`. Swap it out (or point the Postgres credential at a different
database entirely) and the workflow adapts automatically — it re-reads the
schema from `information_schema` on every request.
