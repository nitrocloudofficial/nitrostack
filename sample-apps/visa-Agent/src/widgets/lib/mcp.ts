/**
 * The single place this app touches the MCP host.
 *
 * Every screen goes through `callTool` here — there is no mock data and no
 * second transport. `WidgetSDK.callTool` delegates to `window.openai.callTool`,
 * which the host injects into the widget iframe; that is why this app must run
 * inside an MCP host (NitroStudio) rather than as a standalone page.
 */

import { getWidgetSDK } from '@nitrostack/widgets';
import type {
  CaseGetOutput,
  CaseStartOutput,
  DocumentOcrOutput,
  DocumentUploadOutput,
  DocumentValidateOutput,
  OnboardingExtractOutput,
  ResolveRequirementsOutput,
} from './types';

/** Error carrying enough context for the UI to explain what failed. */
export class ToolCallError extends Error {
  constructor(
    message: string,
    readonly toolName: string,
    readonly kind: 'not-ready' | 'tool-error' | 'bad-response' = 'tool-error',
  ) {
    super(message);
    this.name = 'ToolCallError';
  }
}

/** True once the host has injected its bridge. */
export function isHostReady(): boolean {
  try {
    return getWidgetSDK().isReady();
  } catch {
    return false;
  }
}

/**
 * The host returns `{ result: string, structuredContent?: unknown }`.
 * Prefer `structuredContent` when present; otherwise parse `result` as JSON.
 * Some hosts wrap the payload in an MCP envelope, so unwrap that too.
 */
/** Keys belonging to an MCP tool-result envelope rather than a payload. */
const MCP_ENVELOPE_KEYS = new Set(['content', 'structuredContent', 'isError', '_meta']);

/** Top-level keys when a client forwards the whole JSON-RPC response. */
const JSONRPC_KEYS = new Set(['result', 'id', 'jsonrpc']);

/** Every key that can only be wrapper metadata, never tool payload. */
const ALL_WRAPPER_KEYS = new Set([...MCP_ENVELOPE_KEYS, ...JSONRPC_KEYS]);

/** True when every key of `o` belongs to `allowed` — i.e. it is pure wrapper. */
function hasOnlyKeys(o: Record<string, unknown>, allowed: Set<string>): boolean {
  const keys = Object.keys(o);
  return keys.length > 0 && keys.every((k) => allowed.has(k));
}

/**
 * First text part of an MCP `content` array.
 *
 * A server that throws returns its message here, not in `result`, so this is
 * how the real failure reason is recovered rather than reported as a generic
 * transport problem.
 */
function firstContentText(o: Record<string, unknown>): string | null {
  if (!Array.isArray(o.content)) return null;
  const part = (o.content as Array<{ text?: unknown }>).find((p) => typeof p?.text === 'string');
  return part && typeof part.text === 'string' ? part.text : null;
}

/** Best-effort human-readable message from an error-shaped envelope. */
function errorMessageFrom(o: Record<string, unknown>, toolName: string): string {
  if (typeof o.result === 'string' && o.result.trim()) return o.result.trim();

  const text = firstContentText(o);
  if (text && text.trim()) return text.trim();

  const nested = o.result;
  if (nested != null && typeof nested === 'object' && !Array.isArray(nested)) {
    const inner = firstContentText(nested as Record<string, unknown>);
    if (inner && inner.trim()) return inner.trim();
  }

  return `${toolName} reported an error.`;
}

/**
 * Peels host wrappers until the tool's own payload is reached.
 *
 * Hosts disagree on how deeply they wrap a tool result: some return the flat
 * payload, some `{ result, structuredContent }`, and some forward the entire
 * JSON-RPC response `{ jsonrpc, id, result: { content, structuredContent } }`.
 * A single-pass unwrap handled the first two and silently returned the
 * wrapper for the third, so screens received `{content, structuredContent}`
 * and crashed on the first missing field. Peeling in a loop handles all of
 * them, and the depth cap stops a malformed response spinning.
 *
 * A wrapper layer is only peeled when the object carries nothing but wrapper
 * keys — if real payload fields sit alongside `content`, the root is the
 * payload and is kept.
 */
function unwrap<T>(raw: unknown, toolName: string): T {
  let current: unknown = raw;

  for (let depth = 0; depth < 6; depth += 1) {
    if (typeof current === 'string') {
      const text = current.trim();
      if (text.length === 0) break;
      try {
        current = JSON.parse(text);
      } catch {
        // Not JSON. Every tool in this app returns an object, so a bare
        // string here is the server's own message — surface it verbatim
        // instead of reporting a parse failure the user can't act on.
        throw new ToolCallError(text.slice(0, 400), toolName, 'tool-error');
      }
      continue;
    }

    if (current == null || typeof current !== 'object' || Array.isArray(current)) {
      break;
    }

    const o = current as Record<string, unknown>;

    if (o.isError === true) {
      throw new ToolCallError(errorMessageFrom(o, toolName), toolName, 'tool-error');
    }

    // Whole JSON-RPC response forwarded as the payload.
    if (hasOnlyKeys(o, JSONRPC_KEYS) && o.result != null) {
      current = o.result;
      continue;
    }

    // Only peel an object that is purely wrapper. If real payload fields sit
    // alongside `content`/`structuredContent` — ChatGPT's dual-shape — the
    // root IS the payload, and descending would silently discard it.
    if (hasOnlyKeys(o, ALL_WRAPPER_KEYS)) {
      // MCP tool-result envelope. `structuredContent` is the flat payload.
      if (o.structuredContent != null && typeof o.structuredContent === 'object') {
        current = o.structuredContent;
        continue;
      }

      // Otherwise fall back to the first text part of the content array.
      if (Array.isArray(o.content)) {
        const part = (o.content as Array<{ text?: unknown }>).find(
          (p) => typeof p?.text === 'string',
        );
        if (part && typeof part.text === 'string') {
          current = part.text;
          continue;
        }
      }
    }

    // `{ result: "<json>" }`, possibly alongside other wrapper keys, with no
    // payload fields of its own.
    if (typeof o.result === 'string' && hasOnlyKeys(o, ALL_WRAPPER_KEYS)) {
      current = o.result;
      continue;
    }

    break;
  }

  if (current == null || typeof current !== 'object' || Array.isArray(current)) {
    throw new ToolCallError(
      `${toolName} returned a response this screen could not read.`,
      toolName,
      'bad-response',
    );
  }

  // Still a bare wrapper after peeling — the payload never arrived. Report
  // any message the envelope carried, and otherwise name the keys actually
  // received so the failure is diagnosable instead of just "empty".
  const final = current as Record<string, unknown>;
  if (hasOnlyKeys(final, MCP_ENVELOPE_KEYS)) {
    const carried = firstContentText(final);
    if (carried && carried.trim()) {
      throw new ToolCallError(carried.trim().slice(0, 400), toolName, 'tool-error');
    }
    throw new ToolCallError(
      `${toolName} returned no data (received only: ${Object.keys(final).join(', ') || 'an empty object'}).`,
      toolName,
      'bad-response',
    );
  }

  return current as T;
}


/**
 * Invoke a backend tool by name.
 *
 * Surfaces the "no host bridge" case explicitly instead of letting the SDK's
 * generic `Widget SDK not ready` bubble up, because that is by far the most
 * likely failure and the user needs to be told what to do about it.
 */
export async function callTool<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const sdk = getWidgetSDK();

  if (!sdk.isReady()) {
    throw new ToolCallError(
      'Not connected to the MigrateEase server. Open this app from NitroStudio so it can connect.',
      name,
      'not-ready',
    );
  }

  let raw: unknown;
  try {
    raw = await sdk.callTool(name, args);
  } catch (err) {
    throw new ToolCallError(
      err instanceof Error ? err.message : `Could not reach ${name}.`,
      name,
      'tool-error',
    );
  }

  return unwrap<T>(raw, name);
}

/**
 * Typed wrappers, one per backend tool. Screens call these, never `callTool`
 * directly, so tool names and argument shapes live in exactly one file.
 */
export const api = {
  caseStart: (args: { destinationCountry: string; nationality: string; visaType: string }) =>
    callTool<CaseStartOutput>('case_start', args),

  caseGet: (caseId: string) => callTool<CaseGetOutput>('case_get', { caseId }),

  onboardingExtract: (message: string) =>
    callTool<OnboardingExtractOutput>('onboarding_extract', { message }),

  resolveRequirements: (caseId: string) =>
    callTool<ResolveRequirementsOutput>('resolve_requirements', { caseId }),

  documentUpload: (args: {
    caseId: string;
    documentType: string;
    fileName: string;
    contentBase64: string;
  }) => callTool<DocumentUploadOutput>('document_upload', args),

  documentOcr: (documentId: string) =>
    callTool<DocumentOcrOutput>('document_ocr', { documentId }),

  documentValidate: (args: { caseId: string; documentId: string }) =>
    callTool<DocumentValidateOutput>('document_validate', args),
};

/** Normalizes anything thrown into a message worth showing a user. */
export function toErrorMessage(err: unknown): string {
  if (err instanceof ToolCallError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Something went wrong. Please try again.';
}
