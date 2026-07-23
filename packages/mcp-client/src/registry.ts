// ToolRegistry — holds the discovered catalog and hands out McpTool execute-handles
// that delegate back to the owning client. Keeps discovery separate from execution.
import type { DiscoveredTool, McpTool } from "@sre/types";
import type { McpClient } from "./index";

export class ToolRegistry {
  private byName = new Map<string, DiscoveredTool>();

  constructor(private client: McpClient) {}

  /** Replace the registry contents (typically from client.listTools()). */
  setTools(tools: DiscoveredTool[]): void {
    this.byName.clear();
    for (const t of tools) this.byName.set(t.name, t);
  }

  list(): DiscoveredTool[] {
    return [...this.byName.values()];
  }

  has(name: string): boolean {
    return this.byName.has(name);
  }

  /** Wrap a discovered tool in an executable handle bound to the client. */
  get(name: string): McpTool | undefined {
    const t = this.byName.get(name);
    if (!t) return undefined;
    const client = this.client;
    return {
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      execute: (input) => client.callTool(t.name, input),
    };
  }

  /** All tools as executable handles. */
  handles(): McpTool[] {
    return this.list().map((t) => this.get(t.name)!);
  }
}
