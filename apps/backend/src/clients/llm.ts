/**
 * Shared LLM client, built once. `createLLMClient` reads provider keys from the
 * environment and falls back to a deterministic mock when none are set.
 */
import { createLLMClient } from "@sre/llm";
import type { LLMClient } from "@sre/types";
import { logger } from "../logger";

let client: LLMClient | undefined;

export function getLLMClient(): LLMClient {
  if (!client) {
    client = createLLMClient();
    logger.info("Building LLM client", { provider: client.provider, model: client.model });
  }
  return client;
}

export default getLLMClient;
