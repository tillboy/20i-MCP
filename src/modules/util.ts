// Shared helpers for MCP tool handler modules (src/modules/*).

/** MCP CallTool result envelope used by every tool handler. */
export type ToolResult = { content: Array<{ type: 'text'; text: string }> };

/** Wraps any JSON-serializable value in the MCP text-content envelope. */
export function jsonResult(value: unknown): ToolResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}
