/**
 * Shared MCP client, built once from config. Uses mock mode (canned fixtures)
 * whenever no SigNoz API key is configured.
 */
import { createMcpClient } from "@sre/mcp-client";
import type { McpClient } from "@sre/mcp-client";
import type { McpClientConfig } from "@sre/types";
import { config } from "../config";
import { logger } from "../logger";

let client: McpClient | undefined;

export function getMcpClient(): McpClient {
  if (!client) {
    const cfg: McpClientConfig = {
      url: config.mcpServerUrl,
      apiKey: config.signozApiKey,
      mock: config.mcpMock,
    };
    logger.info("Building MCP client", { url: cfg.url, mock: cfg.mock });
    client = createMcpClient(cfg);
  }
  return client;
}

export default getMcpClient;
