// RealMcpClient — talks to the live SigNoz MCP server over Streamable HTTP.
// Discovers tools at runtime; never hardcodes the signoz_* catalog.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { DiscoveredTool, McpClientConfig, ToolResult } from "@sre/types";
import { buildTransport } from "./transport";
import type { McpClient } from "./index";

// The MCP SDK's callTool() returns a union: a content-block result or a legacy
// { toolResult } shape. We only need the content blocks (if present).
type CallToolResult = Awaited<ReturnType<Client["callTool"]>>;

export class RealMcpClient implements McpClient {
  private client: Client;
  private transport: ReturnType<typeof buildTransport>;
  private connected = false;
  private tools: DiscoveredTool[] = [];

  constructor(private config: McpClientConfig) {
    this.client = new Client({ name: "sre-sidekick", version: "0.0.0" });
    this.transport = buildTransport(config);
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    await this.client.connect(this.transport);
    this.connected = true;
  }

  isConnected(): boolean {
    return this.connected;
  }

  /** Discover the server's tool catalog and cache it. */
  async listTools(): Promise<DiscoveredTool[]> {
    const res = await this.client.listTools();
    this.tools = res.tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema as Record<string, unknown> | undefined,
    }));
    return this.tools;
  }

  getTools(): DiscoveredTool[] {
    return this.tools;
  }

  /** Invoke one tool, measure latency, flatten content, parse JSON where possible. */
  async callTool(name: string, input: Record<string, unknown>): Promise<ToolResult> {
    const started = Date.now();
    try {
      const res = (await this.client.callTool({
        name,
        arguments: input,
      })) as CallToolResult;
      const { text, data } = flatten(res);
      return {
        tool: name,
        input,
        ok: res.isError === true ? false : true,
        text,
        data,
        latencyMs: Date.now() - started,
        source: "live",
      };
    } catch (err) {
      return {
        tool: name,
        input,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        latencyMs: Date.now() - started,
        source: "live",
      };
    }
  }

  async close(): Promise<void> {
    if (!this.connected) return;
    await this.client.close();
    this.connected = false;
  }
}

/** Concatenate text content blocks; parse JSON into `data` when a block is JSON. */
function flatten(res: CallToolResult): { text: string; data?: unknown } {
  const content = "content" in res ? res.content : undefined;
  if (!Array.isArray(content)) {
    // Legacy { toolResult } shape: stringify whatever came back.
    const tr = (res as { toolResult?: unknown }).toolResult;
    return tr === undefined ? { text: "" } : { text: safeStringify(tr), data: tr };
  }
  const parts: string[] = [];
  let data: unknown;
  for (const block of content) {
    if (block.type !== "text") continue;
    parts.push(block.text);
    if (data === undefined) {
      const parsed = tryParse(block.text);
      if (parsed !== undefined) data = parsed;
    }
  }
  return { text: parts.join("\n"), data };
}

function tryParse(s: string): unknown {
  const t = s.trim();
  if (!t || (t[0] !== "{" && t[0] !== "[")) return undefined;
  try {
    return JSON.parse(t);
  } catch {
    return undefined;
  }
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}
