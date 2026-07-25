/**
 * Shared STT (Deepgram) client, built once from config. Boots without a key:
 * `configured` is false and transcription throws a 503 per-request.
 */
import { createSttClient } from "@sre/stt";
import type { SttClient } from "@sre/stt";
import { config } from "../config";
import { logger } from "../logger";

let client: SttClient | undefined;

export function getSttClient(): SttClient {
  if (!client) {
    client = createSttClient({
      apiKey: config.deepgramApiKey,
      model: config.deepgramModel,
      language: config.deepgramLanguage,
    });
    logger.info("Building STT client", {
      configured: client.configured,
      model: client.model,
    });
  }
  return client;
}

export default getSttClient;
