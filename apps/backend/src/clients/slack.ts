/**
 * Shared Slack client, built once from config. Boots without a token:
 * `configured` is false and every send throws a 503 per-call, so the rest of the
 * app (and the /notify routes) stay usable.
 */
import { createSlackClient } from "@sre/slack";
import type { SlackClient } from "@sre/slack";
import { config } from "../config";
import { logger } from "../logger";

let client: SlackClient | undefined;

export function getSlackClient(): SlackClient {
  if (!client) {
    client = createSlackClient({
      botToken: config.slackBotToken,
      defaultChannel: config.slackDefaultChannel,
    });
    logger.info("Building Slack client", {
      configured: client.configured,
      defaultChannel: client.defaultChannel ?? "(none)",
    });
  }
  return client;
}

export default getSlackClient;
