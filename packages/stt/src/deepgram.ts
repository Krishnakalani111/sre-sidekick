/**
 * Deepgram speech-to-text integration.
 *
 * Given an audio buffer (from an uploaded file), it calls Deepgram's prerecorded
 * transcription API and returns the transcript text. The only external service
 * this package touches.
 */
import { createClient, type DeepgramClient } from "@deepgram/sdk";

const DEFAULT_MODEL = "nova-3";
// "multi" enables Deepgram's multilingual mode (code-switching across
// languages). Set language to a specific code (e.g. "en", "es") to pin a single
// language instead. Requires a model that supports it (nova-3).
const DEFAULT_LANGUAGE = "multi";

/** Error carrying an HTTP status so the route can map it to a response. */
export class SttError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "SttError";
    this.status = status;
  }
}

export interface SttConfig {
  apiKey?: string;
  model?: string;
  language?: string;
}

export interface TranscriptionResult {
  transcript: string;
  confidence: number | null;
  model: string;
  language: string;
}

export interface SttClient {
  /** Whether an API key is configured (used by the health endpoint). */
  readonly configured: boolean;
  readonly model: string;
  readonly language: string;
  /** Transcribe an audio buffer. Throws {@link SttError} on failure. */
  transcribe(buffer: Buffer, mimetype?: string): Promise<TranscriptionResult>;
}

class DeepgramSttClient implements SttClient {
  private readonly apiKey?: string;
  readonly model: string;
  readonly language: string;
  private client: DeepgramClient | null = null;

  constructor(config: SttConfig = {}) {
    this.apiKey = config.apiKey && config.apiKey.trim().length > 0 ? config.apiKey : undefined;
    this.model = config.model || DEFAULT_MODEL;
    this.language = config.language || DEFAULT_LANGUAGE;
  }

  get configured(): boolean {
    return Boolean(this.apiKey);
  }

  /** Lazily create the Deepgram client so a missing key fails per-request, not on boot. */
  private getClient(): DeepgramClient {
    if (!this.apiKey) {
      throw new SttError(
        "DEEPGRAM_API_KEY is not set. Add it to .env to enable speech-to-text.",
        503,
      );
    }
    if (!this.client) this.client = createClient(this.apiKey);
    return this.client;
  }

  async transcribe(buffer: Buffer, mimetype?: string): Promise<TranscriptionResult> {
    const deepgram = this.getClient();

    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(buffer, {
      model: this.model,
      language: this.language,
      smart_format: true,
      punctuate: true,
      ...(mimetype ? { mimetype } : {}),
    });

    if (error) {
      throw new SttError(error.message || "Deepgram transcription failed", 502);
    }

    const alt = result?.results?.channels?.[0]?.alternatives?.[0];
    return {
      transcript: alt?.transcript?.trim() || "",
      confidence: alt?.confidence ?? null,
      model: this.model,
      language: this.language,
    };
  }
}

/**
 * Build an SttClient. Options fall back to environment variables:
 *   DEEPGRAM_API_KEY, DEEPGRAM_MODEL, DEEPGRAM_LANGUAGE.
 */
export function createSttClient(opts: SttConfig = {}): SttClient {
  const env = (typeof process !== "undefined" && process.env) || {};
  return new DeepgramSttClient({
    apiKey: opts.apiKey ?? env.DEEPGRAM_API_KEY,
    model: opts.model ?? env.DEEPGRAM_MODEL,
    language: opts.language ?? env.DEEPGRAM_LANGUAGE,
  });
}
