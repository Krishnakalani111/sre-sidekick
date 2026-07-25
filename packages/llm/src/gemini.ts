import type {
  LLMClient,
  LLMCompletionRequest,
  LLMResult,
} from "@sre/types";
import { extractJson } from "./json";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.5-flash";
const MAX_RETRIES = 3;
const MAX_BACKOFF_MS = 35_000;

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Pull the server-suggested retry delay (e.g. "29.5s") out of a 429 body. */
function parseRetryDelayMs(body: string): number | undefined {
  const m = body.match(/"retryDelay"\s*:\s*"([0-9.]+)s"/) || body.match(/retry in ([0-9.]+)s/i);
  return m ? Math.ceil(parseFloat(m[1]) * 1000) : undefined;
}

interface GeminiPart {
  text?: string;
}
interface GeminiContent {
  role?: string;
  parts?: GeminiPart[];
}
interface GeminiResponse {
  candidates?: Array<{ content?: GeminiContent }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
}

/**
 * Google Generative Language REST client. Uses global fetch — no SDK deps.
 */
export class GeminiClient implements LLMClient {
  readonly provider = "gemini";
  readonly model: string;
  private readonly apiKey: string;

  constructor(opts: { apiKey: string; model?: string }) {
    if (!opts.apiKey) throw new Error("GeminiClient requires an API key (GEMINI_API_KEY).");
    this.apiKey = opts.apiKey;
    this.model = opts.model || DEFAULT_MODEL;
  }

  async complete(req: LLMCompletionRequest): Promise<LLMResult> {
    // Collect system instruction text (explicit req.system + any system messages).
    const systemParts: string[] = [];
    if (req.system) systemParts.push(req.system);

    const contents: GeminiContent[] = [];
    for (const m of req.messages) {
      if (m.role === "system") {
        systemParts.push(m.content);
        continue;
      }
      contents.push({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      });
    }

    const generationConfig: Record<string, unknown> = {};
    if (typeof req.temperature === "number") generationConfig.temperature = req.temperature;
    if (typeof req.maxTokens === "number") generationConfig.maxOutputTokens = req.maxTokens;
    if (req.json) generationConfig.responseMimeType = "application/json";

    const body: Record<string, unknown> = { contents };
    if (systemParts.length > 0) {
      body.systemInstruction = { parts: [{ text: systemParts.join("\n\n") }] };
    }
    if (Object.keys(generationConfig).length > 0) body.generationConfig = generationConfig;

    const url = `${BASE_URL}/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    let res!: Response;
    for (let attempt = 0; ; attempt++) {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) break;

      const snippet = (await res.text().catch(() => "")).slice(0, 500);
      // Retry on transient rate-limit / overload, honoring the server's delay.
      if ((res.status === 429 || res.status === 503) && attempt < MAX_RETRIES) {
        const wait = Math.min(parseRetryDelayMs(snippet) ?? 2000 * 2 ** attempt, MAX_BACKOFF_MS);
        await sleep(wait);
        continue;
      }
      throw new Error(`Gemini request failed: ${res.status} ${res.statusText} — ${snippet}`);
    }

    const data = (await res.json()) as GeminiResponse;
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const text = parts.map((p) => p.text ?? "").join("");

    return {
      text,
      provider: this.provider,
      model: this.model,
      raw: data,
      usage: {
        inputTokens: data.usageMetadata?.promptTokenCount,
        outputTokens: data.usageMetadata?.candidatesTokenCount,
      },
    };
  }

  async completeJSON<T = unknown>(req: LLMCompletionRequest): Promise<T> {
    const result = await this.complete({ ...req, json: true });
    return extractJson<T>(result.text);
  }
}
