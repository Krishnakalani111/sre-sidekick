/**
 * Environment configuration. Loads `.env` from both the repo root and the app
 * directory, then validates into a typed `Config` via zod. Everything has a
 * sensible default so the app boots with zero configuration (mock MCP + mock LLM).
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

const here = dirname(fileURLToPath(import.meta.url)); // apps/backend/src
const appDir = resolve(here, ".."); // apps/backend
const repoRoot = resolve(here, "../../.."); // repo root

// App-dir .env wins over the repo-root one (first loaded takes precedence).
dotenv.config({ path: resolve(appDir, ".env") });
dotenv.config({ path: resolve(repoRoot, ".env") });

const EnvSchema = z.object({
  BACKEND_PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().default("postgres://sidekick:sidekick@localhost:5432/sidekick"),
  MCP_SERVER_URL: z.string().url().default("http://localhost:8000/mcp"),
  SIGNOZ_API_KEY: z.string().optional(),
  INVESTIGATION_MAX_STEPS: z.coerce.number().int().positive().default(6),
  LLM_PROVIDER: z.string().default("auto"),
  GEMINI_API_KEY: z.string().optional(),
  XAI_API_KEY: z.string().optional(),
  DEEPGRAM_API_KEY: z.string().optional(),
  DEEPGRAM_MODEL: z.string().default("nova-3"),
  DEEPGRAM_LANGUAGE: z.string().default("multi"),
  SLACK_BOT_TOKEN: z.string().optional(),
  SLACK_DEFAULT_CHANNEL: z.string().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

function coalesceEmpty(v: string | undefined): string | undefined {
  return v && v.trim().length > 0 ? v : undefined;
}

const parsed = EnvSchema.parse(process.env);

export interface Config {
  port: number;
  databaseUrl: string;
  mcpServerUrl: string;
  signozApiKey?: string;
  /** True when no SigNoz API key is set -> MCP client serves fixtures. */
  mcpMock: boolean;
  investigationMaxSteps: number;
  llmProvider: string;
  geminiApiKey?: string;
  xaiApiKey?: string;
  deepgramApiKey?: string;
  deepgramModel: string;
  deepgramLanguage: string;
  slackBotToken?: string;
  slackDefaultChannel?: string;
  /** True when a Slack bot token is set -> outbound Slack notifications enabled. */
  slackConfigured: boolean;
  logLevel: "debug" | "info" | "warn" | "error";
}

const signozApiKey = coalesceEmpty(parsed.SIGNOZ_API_KEY);
const slackBotToken = coalesceEmpty(parsed.SLACK_BOT_TOKEN);

export const config: Config = {
  port: parsed.BACKEND_PORT,
  databaseUrl: parsed.DATABASE_URL,
  mcpServerUrl: parsed.MCP_SERVER_URL,
  signozApiKey,
  mcpMock: !signozApiKey,
  investigationMaxSteps: parsed.INVESTIGATION_MAX_STEPS,
  llmProvider: parsed.LLM_PROVIDER,
  geminiApiKey: coalesceEmpty(parsed.GEMINI_API_KEY),
  xaiApiKey: coalesceEmpty(parsed.XAI_API_KEY),
  deepgramApiKey: coalesceEmpty(parsed.DEEPGRAM_API_KEY),
  deepgramModel: parsed.DEEPGRAM_MODEL,
  deepgramLanguage: parsed.DEEPGRAM_LANGUAGE,
  slackBotToken,
  slackDefaultChannel: coalesceEmpty(parsed.SLACK_DEFAULT_CHANNEL),
  slackConfigured: Boolean(slackBotToken),
  logLevel: parsed.LOG_LEVEL,
};

export default config;
