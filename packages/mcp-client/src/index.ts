// @sre/mcp-client — client for the REAL SigNoz MCP server (signoz/signoz-mcp-server).
// Tools are DISCOVERED at runtime via listTools(); nothing signoz_* is hardcoded.
import type { McpClientConfig, DiscoveredTool, ToolResult } from "@sre/types";
import { RealMcpClient } from "./client";
import { MockMcpClient } from "./mock";

/** Uniform handle over the MCP server (real or mock). */
export interface McpClient {
  connect(): Promise<void>;
  /** discovered tool catalog (also cached on the instance) */
  listTools(): Promise<DiscoveredTool[]>;
  getTools(): DiscoveredTool[]; // cached, sync
  callTool(name: string, input: Record<string, unknown>): Promise<ToolResult>;
  isConnected(): boolean;
  close(): Promise<void>;
}

/**
 * Factory. When config.mock is true (or no url/apiKey is available and mock is
 * requested), returns a MockMcpClient that needs no server.
 */
export function createMcpClient(config: McpClientConfig): McpClient {
  if (config.mock) return new MockMcpClient();
  return new RealMcpClient(config);
}

export { RealMcpClient } from "./client";
export { MockMcpClient } from "./mock";
export { ToolRegistry } from "./registry";
export { buildTransport, DEFAULT_HEADER_NAME } from "./transport";
