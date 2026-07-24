/**
 * Outbound Slack client built on @slack/web-api's WebClient.
 *
 * Mirrors the @sre/stt client conventions: boots without a token (`configured`
 * is false), lazily constructs the WebClient, and throws a typed SlackError
 * (carrying an HTTP status) per-call — so the rest of the app stays usable when
 * Slack is not configured.
 */
import { WebClient } from "@slack/web-api";
import type { ChatPostMessageArguments, ChatUpdateArguments, KnownBlock } from "@slack/web-api";
import type { Alert, Diagnosis, RecommendedAction } from "@sre/types";
import {
  alertToBlocks,
  diagnosisToBlocks,
  investigationStartedBlocks,
  recommendedActionsToBlocks,
  resolvedBlocks,
} from "./blocks";
import type {
  MessageRef,
  ReactionParams,
  ReplyParams,
  SendAlertOptions,
  SendDiagnosisOptions,
  SendMessageParams,
  SlackConfig,
  UpdateMessageParams,
} from "./types";

/** Error carrying an HTTP status (and Slack error code) so a route can map it. */
export class SlackError extends Error {
  status: number;
  /** Slack API error code when present, e.g. "channel_not_found". */
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "SlackError";
    this.status = status;
    this.code = code;
  }
}

export interface SlackClient {
  /** Whether a bot token is configured (used by /health and the backend log line). */
  readonly configured: boolean;
  readonly defaultChannel?: string;

  // --- generic primitives ---
  sendMessage(params: SendMessageParams): Promise<MessageRef>;
  updateMessage(params: UpdateMessageParams): Promise<MessageRef>;
  replyInThread(params: ReplyParams): Promise<MessageRef>;
  addReaction(params: ReactionParams): Promise<void>;

  // --- lifecycle helpers ---
  /** Post the anomaly/alert card. Returns the ref to thread everything under. */
  sendAlert(alert: Alert, opts?: SendAlertOptions): Promise<MessageRef>;
  /** Ack that investigation started; returns a ref the caller can updateMessage() later. */
  startInvestigation(alert: Alert, opts?: SendAlertOptions): Promise<MessageRef>;
  /** Post the RCA/diagnosis card (Approve/Dismiss buttons by default). */
  sendDiagnosis(diagnosis: Diagnosis, opts?: SendDiagnosisOptions): Promise<MessageRef>;
  /** Post just the recommended-actions block with approval buttons. */
  postRecommendedActions(actions: RecommendedAction[], opts?: SendDiagnosisOptions): Promise<MessageRef>;
  /** Edit an existing message in place to a resolved card (optionally add a ✅). */
  markResolved(ref: MessageRef, opts?: { note?: string; react?: boolean }): Promise<MessageRef>;
}

/** Slack error codes mapped to HTTP statuses; anything else is a 502. */
const CODE_STATUS: Record<string, number> = {
  channel_not_found: 422,
  not_in_channel: 422,
  is_archived: 422,
  invalid_blocks: 422,
  msg_too_long: 422,
  ratelimited: 429,
  invalid_auth: 401,
  account_inactive: 401,
  token_revoked: 401,
  missing_scope: 403,
  not_authed: 401,
};

function coalesce(v: string | undefined): string | undefined {
  return v && v.trim().length > 0 ? v : undefined;
}

class SlackWebClient implements SlackClient {
  private readonly botToken?: string;
  readonly defaultChannel?: string;
  private client: WebClient | null = null;

  constructor(config: SlackConfig = {}) {
    this.botToken = coalesce(config.botToken);
    this.defaultChannel = coalesce(config.defaultChannel);
  }

  get configured(): boolean {
    return Boolean(this.botToken);
  }

  /** Lazily create the WebClient so a missing token fails per-call, not on boot. */
  private getClient(): WebClient {
    if (!this.botToken) {
      throw new SlackError(
        "SLACK_BOT_TOKEN is not set. Add it to .env to enable Slack notifications.",
        503,
      );
    }
    if (!this.client) {
      this.client = new WebClient(this.botToken, { retryConfig: { retries: 3 } });
    }
    return this.client;
  }

  private resolveChannel(channel?: string): string {
    const ch = channel ?? this.defaultChannel;
    if (!ch) {
      throw new SlackError("No channel specified and SLACK_DEFAULT_CHANNEL is not set.", 400);
    }
    return ch;
  }

  private toError(err: unknown): SlackError {
    if (err instanceof SlackError) return err;
    const e = err as { data?: { error?: string }; message?: string };
    const code = e?.data?.error;
    const status = code && CODE_STATUS[code] ? CODE_STATUS[code] : 502;
    const message = code ? `Slack API error: ${code}` : e?.message || "Slack API request failed";
    return new SlackError(message, status, code);
  }

  private ref(res: { channel?: string; ts?: string }, fallbackChannel: string): MessageRef {
    if (!res.ts) throw new SlackError("Slack response missing message ts", 502);
    return { channel: res.channel ?? fallbackChannel, ts: res.ts };
  }

  async sendMessage(params: SendMessageParams): Promise<MessageRef> {
    const channel = this.resolveChannel(params.channel);
    const client = this.getClient();
    try {
      const res = await client.chat.postMessage({
        channel,
        text: params.text,
        ...(params.blocks ? { blocks: params.blocks as KnownBlock[] } : {}),
        ...(params.threadTs ? { thread_ts: params.threadTs } : {}),
        unfurl_links: params.unfurlLinks ?? false,
      } as ChatPostMessageArguments);
      return this.ref(res, channel);
    } catch (err) {
      throw this.toError(err);
    }
  }

  async updateMessage(params: UpdateMessageParams): Promise<MessageRef> {
    if (params.text === undefined && !params.blocks) {
      throw new SlackError("updateMessage requires text or blocks.", 400);
    }
    const client = this.getClient();
    try {
      const res = await client.chat.update({
        channel: params.channel,
        ts: params.ts,
        text: params.text ?? "",
        ...(params.blocks ? { blocks: params.blocks as KnownBlock[] } : {}),
      } as ChatUpdateArguments);
      return this.ref(res, params.channel);
    } catch (err) {
      throw this.toError(err);
    }
  }

  async replyInThread(params: ReplyParams): Promise<MessageRef> {
    const channel = this.resolveChannel(params.channel);
    const client = this.getClient();
    try {
      const res = await client.chat.postMessage({
        channel,
        text: params.text,
        thread_ts: params.threadTs,
        ...(params.blocks ? { blocks: params.blocks as KnownBlock[] } : {}),
        ...(params.broadcast ? { reply_broadcast: true } : {}),
        unfurl_links: false,
      } as ChatPostMessageArguments);
      return this.ref(res, channel);
    } catch (err) {
      throw this.toError(err);
    }
  }

  async addReaction(params: ReactionParams): Promise<void> {
    const client = this.getClient();
    try {
      await client.reactions.add({ channel: params.channel, timestamp: params.ts, name: params.name });
    } catch (err) {
      const mapped = this.toError(err);
      // Re-reacting is harmless — don't surface it as a failure.
      if (mapped.code === "already_reacted") return;
      throw mapped;
    }
  }

  async sendAlert(alert: Alert, opts: SendAlertOptions = {}): Promise<MessageRef> {
    return this.sendMessage({
      channel: opts.channel,
      threadTs: opts.threadTs,
      text: `[${alert.severity.toUpperCase()}] ${alert.name}`,
      blocks: alertToBlocks(alert),
    });
  }

  async startInvestigation(alert: Alert, opts: SendAlertOptions = {}): Promise<MessageRef> {
    return this.sendMessage({
      channel: opts.channel,
      threadTs: opts.threadTs,
      text: `Investigating: ${alert.name}`,
      blocks: investigationStartedBlocks(alert),
    });
  }

  async sendDiagnosis(diagnosis: Diagnosis, opts: SendDiagnosisOptions = {}): Promise<MessageRef> {
    return this.sendMessage({
      channel: opts.channel,
      threadTs: opts.threadTs,
      text: `RCA: ${diagnosis.title}`,
      blocks: diagnosisToBlocks(diagnosis, {
        withActions: opts.withActions ?? true,
        investigationId: opts.investigationId,
      }),
    });
  }

  async postRecommendedActions(
    actions: RecommendedAction[],
    opts: SendDiagnosisOptions = {},
  ): Promise<MessageRef> {
    return this.sendMessage({
      channel: opts.channel,
      threadTs: opts.threadTs,
      text: "Recommended actions",
      blocks: recommendedActionsToBlocks(actions, { investigationId: opts.investigationId }),
    });
  }

  async markResolved(ref: MessageRef, opts: { note?: string; react?: boolean } = {}): Promise<MessageRef> {
    const updated = await this.updateMessage({
      channel: ref.channel,
      ts: ref.ts,
      text: opts.note ? `Resolved: ${opts.note}` : "Resolved",
      blocks: resolvedBlocks(opts.note),
    });
    if (opts.react) {
      // Best-effort: the resolve (message update) is the point — don't fail it
      // just because a cosmetic ✅ couldn't be added (e.g. missing reactions:write).
      try {
        await this.addReaction({ channel: ref.channel, ts: ref.ts, name: "white_check_mark" });
      } catch {
        /* ignore reaction failure */
      }
    }
    return updated;
  }
}

/**
 * Build a SlackClient. Options fall back to environment variables:
 *   SLACK_BOT_TOKEN, SLACK_DEFAULT_CHANNEL.
 */
export function createSlackClient(opts: SlackConfig = {}): SlackClient {
  const env = (typeof process !== "undefined" && process.env) || {};
  return new SlackWebClient({
    botToken: opts.botToken ?? env.SLACK_BOT_TOKEN,
    defaultChannel: opts.defaultChannel ?? env.SLACK_DEFAULT_CHANNEL,
  });
}
