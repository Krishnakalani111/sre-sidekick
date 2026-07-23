/**
 * Entry point. Loads config (which loads .env), builds the app, connects the
 * shared MCP client, listens on BACKEND_PORT, and installs graceful shutdown.
 *
 * Boots with zero configuration: no SIGNOZ_API_KEY -> MCP mock mode; no LLM keys
 * -> mock LLM provider.
 */
import type { Server } from "node:http";
import { config } from "./config";
import { logger } from "./logger";
import { buildApp } from "./server";
import { getMcpClient } from "./clients/mcp";
import { getLLMClient } from "./clients/llm";

async function main(): Promise<void> {
  const app = buildApp();
  const llm = getLLMClient();
  const mcpClient = getMcpClient();

  // Connect the MCP client up front; the pipeline also connects lazily.
  try {
    await mcpClient.connect();
    const tools = await mcpClient.listTools();
    logger.info("MCP connected", { mock: config.mcpMock, tools: tools.length });
  } catch (err) {
    logger.warn("MCP connect failed at startup; will retry on first investigation", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const server: Server = app.listen(config.port, () => {
    logger.info("SRE Sidekick backend listening", {
      port: config.port,
      llmProvider: llm.provider,
      mcpMock: config.mcpMock,
    });
  });

  const shutdown = (signal: string): void => {
    logger.info("Shutting down", { signal });
    server.close(() => {
      void mcpClient
        .close()
        .catch(() => undefined)
        .finally(() => {
          logger.info("Shutdown complete");
          process.exit(0);
        });
    });
    // Force-exit if graceful shutdown stalls.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.error("Fatal startup error", {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
