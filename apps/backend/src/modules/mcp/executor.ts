/**
 * Executor — runs a batch of planner-issued ToolCalls against the MCP client,
 * in parallel, returning a ToolResult per call. Never throws: a failed call is
 * captured as a `ToolResult` with `ok: false`.
 */
import type { McpClient } from "@sre/mcp-client";
import type { ToolCall, ToolResult } from "@sre/types";
import { logger } from "../../logger";

export async function execute(
  mcpClient: McpClient,
  calls: ToolCall[],
): Promise<ToolResult[]> {
  return Promise.all(calls.map((call) => runOne(mcpClient, call)));
}

async function runOne(mcpClient: McpClient, call: ToolCall): Promise<ToolResult> {
  const started = Date.now();
  try {
    logger.debug("Executing tool", { tool: call.tool });
    const result = await mcpClient.callTool(call.tool, call.input ?? {});
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn("Tool call threw", { tool: call.tool, error: message });
    return {
      tool: call.tool,
      input: call.input ?? {},
      ok: false,
      error: message,
      latencyMs: Date.now() - started,
      source: "live",
    };
  }
}

export default execute;
