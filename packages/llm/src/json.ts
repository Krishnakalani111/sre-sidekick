/**
 * Robust JSON extraction from raw LLM text output.
 *
 * Models frequently wrap JSON in ```json fences or add prose around it. This
 * helper strips fences, isolates the outermost balanced `{...}` (or `[...]`)
 * object, and parses it. It throws a clear, truncated error when it cannot.
 */

const MAX_ERR_LEN = 800;

function truncate(s: string, n = MAX_ERR_LEN): string {
  return s.length > n ? `${s.slice(0, n)}… (${s.length} chars total)` : s;
}

/** Strip a leading/trailing markdown code fence (```json ... ```). */
function stripFences(text: string): string {
  let t = text.trim();
  // ```json\n ... \n```   or   ``` ... ```
  const fence = /^```[a-zA-Z0-9_-]*\s*\n?([\s\S]*?)\n?```$/;
  const m = t.match(fence);
  if (m) t = m[1].trim();
  return t;
}

/**
 * Find the outermost balanced JSON value (object or array) inside `text`,
 * accounting for strings and escapes so braces inside string literals don't
 * throw off the balance count. Returns the substring or null.
 */
function findOutermost(text: string): string | null {
  const open = text.search(/[{[]/);
  if (open === -1) return null;
  const openChar = text[open];
  const closeChar = openChar === "{" ? "}" : "]";

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === openChar) {
      depth++;
    } else if (ch === closeChar) {
      depth--;
      if (depth === 0) {
        return text.slice(open, i + 1);
      }
    }
  }
  return null;
}

/**
 * Parse JSON out of arbitrary LLM text. Order of attempts:
 *  1. direct parse of the fence-stripped text,
 *  2. parse of the outermost balanced object/array found in the text.
 * Throws with the (truncated) raw text on failure.
 */
export function extractJson<T = unknown>(raw: string): T {
  const stripped = stripFences(raw);

  // Fast path: the whole thing is JSON.
  try {
    return JSON.parse(stripped) as T;
  } catch {
    // fall through
  }

  const candidate = findOutermost(stripped) ?? findOutermost(raw);
  if (candidate) {
    try {
      return JSON.parse(candidate) as T;
    } catch (err) {
      throw new Error(
        `Failed to parse extracted JSON (${(err as Error).message}). Raw text: ${truncate(raw)}`,
      );
    }
  }

  throw new Error(`No JSON object/array found in LLM output. Raw text: ${truncate(raw)}`);
}
