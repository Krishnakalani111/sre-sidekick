// Builds the Streamable HTTP transport pointing at the SigNoz MCP server,
// injecting the SigNoz auth header. Header name defaults to "SIGNOZ-API-KEY".
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { McpClientConfig } from "@sre/types";

export const DEFAULT_HEADER_NAME = "SIGNOZ-API-KEY";

/** Construct a StreamableHTTPClientTransport with the auth header baked into requestInit. */
export function buildTransport(config: McpClientConfig): StreamableHTTPClientTransport {
  const headerName = config.headerName ?? DEFAULT_HEADER_NAME;
  const headers: Record<string, string> = {};
  if (config.apiKey) headers[headerName] = config.apiKey;

  // Custom HTTP headers are passed via requestInit (see StreamableHTTPClientTransportOptions).
  return new StreamableHTTPClientTransport(new URL(config.url), {
    requestInit: { headers },
  });
}
