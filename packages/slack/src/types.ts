/**
 * Public shapes for the @sre/slack outbound notification service.
 *
 * `blocks` are typed as `unknown[]` so callers need not depend on @slack/web-api:
 * the exported builders return valid Block Kit arrays, and raw JSON (e.g. from an
 * HTTP body) can be passed straight through.
 */

/** Options for {@link createSlackClient}; each field falls back to an env var. */
export interface SlackConfig {
  /** Slack bot token (xoxb-…). Falls back to SLACK_BOT_TOKEN. */
  botToken?: string;
  /** Channel used when a send omits `channel`. Falls back to SLACK_DEFAULT_CHANNEL. */
  defaultChannel?: string;
}

/**
 * A pointer to a posted message so callers can thread replies onto it or update
 * it later. `channel` is the resolved channel **id** Slack returned — pass this
 * (not a human `#name`) back into updateMessage/replyInThread.
 */
export interface MessageRef {
  channel: string;
  ts: string;
}

export interface SendMessageParams {
  /** Channel id or name; falls back to the configured default channel. */
  channel?: string;
  /** Required — the notification/accessibility fallback shown when blocks render. */
  text: string;
  blocks?: unknown[];
  /** Post as a threaded reply under this parent message ts. */
  threadTs?: string;
  /** Whether to unfurl links (default false). */
  unfurlLinks?: boolean;
}

export interface UpdateMessageParams {
  /** Must be the resolved channel id from the original MessageRef. */
  channel: string;
  ts: string;
  text?: string;
  blocks?: unknown[];
}

export interface ReplyParams {
  channel?: string;
  threadTs: string;
  text: string;
  blocks?: unknown[];
  /** Also echo the reply to the channel, not just the thread. */
  broadcast?: boolean;
}

export interface ReactionParams {
  channel: string;
  ts: string;
  /** Emoji name without colons, e.g. "white_check_mark". */
  name: string;
}

export interface SendAlertOptions {
  channel?: string;
  threadTs?: string;
}

export interface SendDiagnosisOptions {
  channel?: string;
  /** Post the RCA under the originating alert message. */
  threadTs?: string;
  /** Append Approve/Dismiss action buttons (default true). */
  withActions?: boolean;
  /** Embedded into each button's `value` so a handler can correlate. */
  investigationId?: string;
}

/**
 * Shared action_ids so the interactive slack-bot's Bolt handlers and these
 * buttons agree. These intentionally match apps/slack-bot/src/app.js.
 */
export const ACTION_IDS = {
  APPROVE_FIX: "approve_fix",
  DISMISS_FIX: "dismiss_fix",
} as const;
