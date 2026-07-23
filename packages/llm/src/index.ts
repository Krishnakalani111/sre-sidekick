/**
 * @sre/llm — provider-agnostic LLM client for RCA reasoning.
 *
 * Provides three LLMClient implementations (Gemini, Grok, Mock) behind a
 * single factory. No SDK dependencies — all providers use global fetch.
 */
import type { LLMClient } from "@sre/types";
import { GeminiClient } from "./gemini";
import { GrokClient } from "./grok";
import { MockClient } from "./mock";

export { GeminiClient } from "./gemini";
export { GrokClient } from "./grok";
export { MockClient } from "./mock";
export { extractJson } from "./json";

export interface CreateLLMOptions {
  provider?: "auto" | "gemini" | "grok" | "mock";
  geminiApiKey?: string;
  geminiModel?: string;
  xaiApiKey?: string;
  grokModel?: string;
}

/**
 * Build an LLMClient. Options fall back to environment variables:
 *   LLM_PROVIDER, GEMINI_API_KEY, GEMINI_MODEL, XAI_API_KEY, GROK_MODEL.
 *
 * Provider selection when "auto" (the default): Gemini if a Gemini key is
 * available, else Grok if an xAI key is available, else the offline Mock.
 */
export function createLLMClient(opts: CreateLLMOptions = {}): LLMClient {
  const env = (typeof process !== "undefined" && process.env) || {};

  const provider =
    opts.provider ??
    (env.LLM_PROVIDER as CreateLLMOptions["provider"] | undefined) ??
    "auto";

  const geminiApiKey = opts.geminiApiKey ?? env.GEMINI_API_KEY;
  const geminiModel = opts.geminiModel ?? env.GEMINI_MODEL;
  const xaiApiKey = opts.xaiApiKey ?? env.XAI_API_KEY;
  const grokModel = opts.grokModel ?? env.GROK_MODEL;

  switch (provider) {
    case "gemini":
      return new GeminiClient({ apiKey: requireKey(geminiApiKey, "GEMINI_API_KEY"), model: geminiModel });
    case "grok":
      return new GrokClient({ apiKey: requireKey(xaiApiKey, "XAI_API_KEY"), model: grokModel });
    case "mock":
      return new MockClient();
    case "auto":
    default:
      if (geminiApiKey) return new GeminiClient({ apiKey: geminiApiKey, model: geminiModel });
      if (xaiApiKey) return new GrokClient({ apiKey: xaiApiKey, model: grokModel });
      return new MockClient();
  }
}

function requireKey(key: string | undefined, envName: string): string {
  if (!key) {
    throw new Error(`Missing API key: set ${envName} or pass it via createLLMClient options.`);
  }
  return key;
}
