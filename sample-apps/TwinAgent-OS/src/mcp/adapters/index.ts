import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export function formatMCPResponse(data: unknown): CallToolResult {
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
  };
}

export function formatMCPError(error: unknown): CallToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [
      {
        type: 'text',
        text: `Error executing MCP Tool: ${message}`,
      },
    ],
    isError: true,
  };
}
