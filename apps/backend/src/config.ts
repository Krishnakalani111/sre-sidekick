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
  MCP_SERVER_URL: z.string().url().default("http://localhost:8000/mcp"),
  SIGNOZ_API_KEY: z.string().optional(),
  INVESTIGATION_MAX_STEPS: z.coerce.number().int().positive().default(6),
  LLM_PROVIDER: z.string().default("auto"),
  GEMINI_API_KEY: z.string().optional(),
  XAI_API_KEY: z.string().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

function coalesceEmpty(v: string | undefined): string | undefined {
  return v && v.trim().length > 0 ? v : undefined;
}

const parsed = EnvSchema.parse(process.env);

export interface Config {
  port: number;
  mcpServerUrl: string;
  signozApiKey?: string;
  /** True when no SigNoz API key is set -> MCP client serves fixtures. */
  mcpMock: boolean;
  investigationMaxSteps: number;
  llmProvider: string;
  geminiApiKey?: string;
  xaiApiKey?: string;
  logLevel: "debug" | "info" | "warn" | "error";
}

const signozApiKey = coalesceEmpty(parsed.SIGNOZ_API_KEY);

export const config: Config = {
  port: parsed.BACKEND_PORT,
  mcpServerUrl: parsed.MCP_SERVER_URL,
  signozApiKey,
  mcpMock: !signozApiKey,
  investigationMaxSteps: parsed.INVESTIGATION_MAX_STEPS,
  llmProvider: parsed.LLM_PROVIDER,
  geminiApiKey: coalesceEmpty(parsed.GEMINI_API_KEY),
  xaiApiKey: coalesceEmpty(parsed.XAI_API_KEY),
  logLevel: parsed.LOG_LEVEL,
};

export default config;
