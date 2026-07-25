/**
 * @sre/slack — outbound Slack notifications via @slack/web-api.
 *
 * A small WebClient wrapper any monorepo service can import (e.g. a cron/watcher
 * firing on a metric anomaly), plus exported Block Kit builders for the
 * alert → investigate → diagnosis → approve → resolve lifecycle. Boots without a
 * token: `configured` is false and every send throws a 503 SlackError per-call,
 * so the rest of the app stays usable.
 */
export { createSlackClient, SlackError, type SlackClient } from "./slack";
export {
  alertToBlocks,
  diagnosisToBlocks,
  recommendedActionsToBlocks,
  investigationStartedBlocks,
  resolvedBlocks,
  severityColor,
  severityEmoji,
  confidenceLabel,
} from "./blocks";
export {
  ACTION_IDS,
  type SlackConfig,
  type MessageRef,
  type SendMessageParams,
  type UpdateMessageParams,
  type ReplyParams,
  type ReactionParams,
  type SendAlertOptions,
  type SendDiagnosisOptions,
} from "./types";
