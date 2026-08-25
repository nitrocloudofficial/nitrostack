/**
 * Era-aware JSON-RPC error mapping.
 *
 * The 2026-07-28 revision changed the error for a missing resource
 * (SEP-2164): `resources/read` on an unknown URI now returns `-32602`
 * (Invalid Params) instead of the 2025-era `-32002` (Resource Not Found).
 * NitroStack keeps the 2025 mapping on the legacy path; the modern adapter
 * uses `mapToJsonRpcError` so its handlers throw the right code.
 *
 * @module
 */

import {
  McpError,
  ValidationError,
  ToolNotFoundError,
  ResourceNotFoundError,
  PromptNotFoundError,
  RateLimitError,
} from '../../errors.js';

/** Standard JSON-RPC / MCP error codes. */
export const JSON_RPC = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  /** SEP-2243: request header/body mismatch. */
  HEADER_BODY_MISMATCH: -32020,
} as const;

/** A JSON-RPC error object. */
export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

/**
 * Map a thrown error to a JSON-RPC error for the modern (2026-07-28) path.
 *
 * Key difference vs legacy: `ResourceNotFoundError` → `-32602` (SEP-2164).
 */
export function mapToJsonRpcError(error: unknown): JsonRpcError {
  if (error instanceof ResourceNotFoundError) {
    // SEP-2164: unknown resource is Invalid Params on 2026-07-28.
    return { code: JSON_RPC.INVALID_PARAMS, message: error.message };
  }
  if (error instanceof ValidationError) {
    return { code: JSON_RPC.INVALID_PARAMS, message: error.message, data: error.details };
  }
  if (error instanceof ToolNotFoundError || error instanceof PromptNotFoundError) {
    return { code: JSON_RPC.METHOD_NOT_FOUND, message: error.message };
  }
  if (error instanceof RateLimitError) {
    return { code: JSON_RPC.INTERNAL_ERROR, message: error.message };
  }
  if (error instanceof McpError) {
    return { code: JSON_RPC.INTERNAL_ERROR, message: error.message, data: error.details };
  }
  const message = error instanceof Error ? error.message : String(error);
  return { code: JSON_RPC.INTERNAL_ERROR, message };
}
