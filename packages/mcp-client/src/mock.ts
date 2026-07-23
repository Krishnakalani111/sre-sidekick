// MockMcpClient — zero-network stand-in that mimics the SigNoz MCP server.
// Lets the whole planner/executor pipeline run offline with no API key.
import type { DiscoveredTool, ToolResult } from "@sre/types";
import type { McpClient } from "./index";

// A small but realistic slice of the real signoz_* catalog.
const CATALOG: DiscoveredTool[] = [
  {
    name: "signoz_list_services",
    description: "List instrumented services with health/error-rate/latency rollups over a time range.",
    inputSchema: {
      type: "object",
      properties: {
        start: { type: "string", description: "ISO8601 or relative (e.g. 'now-1h')" },
        end: { type: "string", description: "ISO8601 or 'now'" },
      },
    },
  },
  {
    name: "signoz_search_traces",
    description: "Search distributed traces, optionally filtered by service, status, or attributes.",
    inputSchema: {
      type: "object",
      properties: {
        service: { type: "string" },
        status: { type: "string", enum: ["ok", "error"] },
        minDurationMs: { type: "number" },
        limit: { type: "number", default: 20 },
      },
    },
  },
  {
    name: "signoz_search_logs",
    description: "Search logs with a query string, filterable by service, severity, and trace_id.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        service: { type: "string" },
        severity: { type: "string", enum: ["debug", "info", "warn", "error"] },
        trace_id: { type: "string" },
        limit: { type: "number", default: 50 },
      },
    },
  },
  {
    name: "signoz_query_metrics",
    description: "Query a metric time series (e.g. latency, error rate) for a service.",
    inputSchema: {
      type: "object",
      properties: {
        metric: { type: "string", description: "e.g. 'latency_p99', 'error_rate'" },
        service: { type: "string" },
        step: { type: "string", description: "resolution, e.g. '1m'" },
      },
      required: ["metric"],
    },
  },
];

// Canned fixture payloads keyed by tool name. Data models an unhealthy `gateway`.
const FIXTURES: Record<string, unknown> = {
  signoz_list_services: {
    services: [
      { name: "gateway", p99_ms: 4200, error_rate: 0.23, rps: 180, healthy: false },
      { name: "checkout", p99_ms: 380, error_rate: 0.01, rps: 90, healthy: true },
      { name: "payments", p99_ms: 210, error_rate: 0.004, rps: 60, healthy: true },
      { name: "catalog", p99_ms: 95, error_rate: 0.0, rps: 240, healthy: true },
    ],
  },
  signoz_search_traces: {
    traces: [
      {
        trace_id: "3f9a1c7e2b4d5a6f",
        service: "gateway",
        duration_ms: 5120,
        status: "error",
        root_span: "POST /api/checkout",
        exception: "UpstreamTimeout: payments did not respond within 5000ms",
      },
      {
        trace_id: "a12bc934de56f780",
        service: "gateway",
        duration_ms: 4870,
        status: "error",
        root_span: "POST /api/checkout",
        exception: "ConnectionResetError: connection reset by peer (payments)",
      },
    ],
  },
  signoz_search_logs: {
    logs: [
      {
        ts: "2026-07-23T10:14:02Z",
        service: "gateway",
        severity: "error",
        trace_id: "3f9a1c7e2b4d5a6f",
        body: "upstream request to payments timed out after 5000ms",
      },
      {
        ts: "2026-07-23T10:14:03Z",
        service: "gateway",
        severity: "error",
        trace_id: "a12bc934de56f780",
        body: "connection reset while reading response from payments",
      },
      {
        ts: "2026-07-23T10:14:05Z",
        service: "payments",
        severity: "warn",
        trace_id: "a12bc934de56f780",
        body: "worker pool saturated: 100/100 in use, queue depth 340",
      },
    ],
  },
  signoz_query_metrics: {
    metric: "latency_p99",
    service: "gateway",
    unit: "ms",
    series: [
      { ts: "2026-07-23T10:10:00Z", value: 380 },
      { ts: "2026-07-23T10:11:00Z", value: 410 },
      { ts: "2026-07-23T10:12:00Z", value: 1200 },
      { ts: "2026-07-23T10:13:00Z", value: 3300 },
      { ts: "2026-07-23T10:14:00Z", value: 4200 },
    ],
  },
};

export class MockMcpClient implements McpClient {
  private connected = false;

  async connect(): Promise<void> {
    this.connected = true;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async listTools(): Promise<DiscoveredTool[]> {
    return CATALOG;
  }

  getTools(): DiscoveredTool[] {
    return CATALOG;
  }

  async callTool(name: string, input: Record<string, unknown>): Promise<ToolResult> {
    const started = Date.now();
    const data = FIXTURES[name];
    if (data === undefined) {
      return {
        tool: name,
        input,
        ok: false,
        error: `mock: unknown tool "${name}"`,
        latencyMs: Date.now() - started,
        source: "mock",
      };
    }
    return {
      tool: name,
      input,
      ok: true,
      data,
      text: JSON.stringify(data, null, 2),
      latencyMs: Date.now() - started,
      source: "mock",
    };
  }

  async close(): Promise<void> {
    this.connected = false;
  }
}
