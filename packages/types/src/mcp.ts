/**
 * MCP contract. We talk to the REAL SigNoz MCP server (signoz/signoz-mcp-server),
 * which exposes 40+ `signoz_*` tools. We therefore DISCOVER tools at runtime via
 * listTools() rather than hardcoding schemas here — the server is the source of
 * truth. These types describe discovered tools, tool calls, and result envelopes.
 */

export const SIGNAL_VALUES = ["traces", "logs", "metrics"] as const;
export type Signal = (typeof SIGNAL_VALUES)[number];

/**
 * A tool as reported by the MCP server's listTools(). `inputSchema` is the raw
 * JSON Schema the server advertises — passed straight to the planner LLM.
 */
export interface DiscoveredTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

/** A planner-issued request to run one tool. */
export interface ToolCall {
  tool: string;
  input: Record<string, unknown>;
  /** Why the planner chose this call — recorded on the timeline for audit. */
  reason?: string;
}

/** The envelope returned for every tool execution (success or failure). */
export interface ToolResult<T = unknown> {
  tool: string;
  input: Record<string, unknown>;
  ok: boolean;
  /** Parsed structured result when the tool returns JSON. */
  data?: T;
  /** Flat text rendering of the MCP content blocks (always populated). */
  text?: string;
  error?: string;
  latencyMs: number;
  /** "live" = real SigNoz via MCP, "mock" = offline fixture. */
  source: "live" | "mock";
}

/** Runtime handle for a single discovered tool. */
export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  execute(input: Record<string, unknown>): Promise<ToolResult>;
}

/** Connection config for the MCP client. */
export interface McpClientConfig {
  /** e.g. http://localhost:8000/mcp */
  url: string;
  /** SigNoz API key, sent as the SIGNOZ-API-KEY header. */
  apiKey?: string;
  headerName?: string; // default: "SIGNOZ-API-KEY"
  /** When true, skip the real server and serve canned fixtures. */
  mock?: boolean;
}
