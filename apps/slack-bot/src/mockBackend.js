/**
 * Stand-in for KK's Node.js Sidekick server. Same response shape the real
 * /investigate endpoint will return, so swapping this out later is a
 * find-and-replace of the fetch call in app.js.
 */

const SAMPLE_ROOT_CAUSES = [
  {
    rootCause: "Database connection pool exhaustion on `orders-service`",
    confidence: 0.87,
    evidence: [
      "SigNoz: p99 latency on /checkout jumped from 120ms to 4.8s at 14:02 UTC",
      "SigNoz: pg_pool.active_connections hit max (20/20) at 14:01 UTC",
      "Traces: 340 spans stuck in `db.query` awaiting a connection",
    ],
    suggestedFix: "Bump orders-service DB pool size from 20 to 50 and restart the pods.",
  },
  {
    rootCause: "Downstream payment-gateway API timeout",
    confidence: 0.74,
    evidence: [
      "SigNoz: error rate on payment-gateway calls rose to 22% starting 09:14 UTC",
      "Logs: `ETIMEDOUT` seen 118 times in payments-worker in the last 10 minutes",
    ],
    suggestedFix: "Enable circuit breaker fallback and retry with backoff on payment-gateway client.",
  },
  {
    rootCause: "Memory leak in `notification-worker` after last deploy",
    confidence: 0.65,
    evidence: [
      "SigNoz: RSS memory on notification-worker climbing linearly since deploy at 08:00 UTC",
      "Alerts: OOMKilled events x3 in the last hour",
    ],
    suggestedFix: "Roll back notification-worker to previous image tag and file a bug for the leak.",
  },
];

function pickMockRCA() {
  return SAMPLE_ROOT_CAUSES[Math.floor(Math.random() * SAMPLE_ROOT_CAUSES.length)];
}

/**
 * @param {string} query - free text from the Slack message, e.g. "checkout is slow"
 * @returns {Promise<object>} mocked investigation result
 */
async function investigate(query) {
  // simulate network + LLM latency
  await new Promise((resolve) => setTimeout(resolve, 800));

  const rca = pickMockRCA();

  return {
    query,
    status: "completed",
    rootCause: rca.rootCause,
    confidence: rca.confidence,
    evidence: rca.evidence,
    suggestedFix: rca.suggestedFix,
    timeline: [
      { time: new Date(Date.now() - 5 * 60000).toISOString(), event: "Alert fired in SigNoz" },
      { time: new Date(Date.now() - 4 * 60000).toISOString(), event: "Sidekick began investigation" },
      { time: new Date().toISOString(), event: "RCA generated (mock)" },
    ],
    verificationStatus: "pending_approval",
  };
}

module.exports = { investigate };
