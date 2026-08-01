import { z } from 'zod';

export type ToolHandler<TInput = Record<string, unknown>, TOutput = unknown> = (
  args: TInput
) => Promise<TOutput>;

export interface MCPTool<TInput = Record<string, unknown>, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  execute: ToolHandler<TInput, TOutput>;
}

export interface ToolRequest {
  name: string;
  args?: Record<string, unknown>;
}

export interface ToolResponseContent {
  type: 'text' | 'image' | 'audio' | 'resource';
  text?: string;
  data?: string;
  mimeType?: string;
  [key: string]: unknown;
}

export interface ToolResponse {
  content: ToolResponseContent[];
  isError?: boolean;
}
