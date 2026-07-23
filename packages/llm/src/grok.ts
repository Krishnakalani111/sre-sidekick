import type {
  LLMClient,
  LLMCompletionRequest,
  LLMResult,
} from "@sre/types";
import { extractJson } from "./json";

const URL = "https://api.x.ai/v1/chat/completions";
const DEFAULT_MODEL = "grok-2-latest";

interface GrokResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

/**
 * xAI Grok client — OpenAI-compatible chat completions API. Uses global fetch.
 */
export class GrokClient implements LLMClient {
  readonly provider = "grok";
  readonly model: string;
  private readonly apiKey: string;

  constructor(opts: { apiKey: string; model?: string }) {
    if (!opts.apiKey) throw new Error("GrokClient requires an API key (XAI_API_KEY).");
    this.apiKey = opts.apiKey;
    this.model = opts.model || DEFAULT_MODEL;
  }

  async complete(req: LLMCompletionRequest): Promise<LLMResult> {
    const messages: Array<{ role: string; content: string }> = [];
    if (req.system) messages.push({ role: "system", content: req.system });
    for (const m of req.messages) {
      messages.push({ role: m.role, content: m.content });
    }

    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      temperature: typeof req.temperature === "number" ? req.temperature : 0,
    };
    if (typeof req.maxTokens === "number") body.max_tokens = req.maxTokens;
    if (req.json) body.response_format = { type: "json_object" };

    const res = await fetch(URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const snippet = (await res.text().catch(() => "")).slice(0, 500);
      throw new Error(`Grok request failed: ${res.status} ${res.statusText} — ${snippet}`);
    }

    const data = (await res.json()) as GrokResponse;
    const text = data.choices?.[0]?.message?.content ?? "";

    return {
      text,
      provider: this.provider,
      model: this.model,
      raw: data,
      usage: {
        inputTokens: data.usage?.prompt_tokens,
        outputTokens: data.usage?.completion_tokens,
      },
    };
  }

  async completeJSON<T = unknown>(req: LLMCompletionRequest): Promise<T> {
    const result = await this.complete({ ...req, json: true });
    return extractJson<T>(result.text);
  }
}
