import { randomUUID } from 'node:crypto';

export const CONTRACT_VERSION = 'hm.v1' as const;

export interface EnvelopeError {
  code: string;
  message: string;
  retryable: boolean;
}

interface EnvelopeBase<TStatus extends string> {
  contractVersion: typeof CONTRACT_VERSION;
  requestId: string;
  status: TStatus;
  warnings: string[];
}

export type SuccessEnvelope<TStatus extends string, TData extends Record<string, unknown>> = EnvelopeBase<TStatus> &
  TData & {
    ok: true;
  };

export type ErrorEnvelope<TStatus extends string> = EnvelopeBase<TStatus> & {
  ok: false;
  error: EnvelopeError;
};

export type Envelope<TStatus extends string, TData extends Record<string, unknown>> =
  | SuccessEnvelope<TStatus, TData>
  | ErrorEnvelope<TStatus>;

/** Shared statuses every `hm.v1` tool may return regardless of its own success discriminant (PRD §6). */
export type CommonFailureStatus = 'DEPENDENCY_UNAVAILABLE' | 'INVALID_INPUT';

export function buildSuccessEnvelope<TStatus extends string, TData extends Record<string, unknown>>(
  status: TStatus,
  data: TData,
  warnings: string[] = []
): SuccessEnvelope<TStatus, TData> {
  return {
    contractVersion: CONTRACT_VERSION,
    requestId: randomUUID(),
    ok: true,
    status,
    warnings,
    ...data,
  };
}

export function buildErrorEnvelope<TStatus extends string>(
  status: TStatus,
  error: EnvelopeError,
  warnings: string[] = []
): ErrorEnvelope<TStatus> {
  return {
    contractVersion: CONTRACT_VERSION,
    requestId: randomUUID(),
    ok: false,
    status,
    warnings,
    error,
  };
}

export function dependencyUnavailableEnvelope(message: string): ErrorEnvelope<CommonFailureStatus> {
  return buildErrorEnvelope('DEPENDENCY_UNAVAILABLE', {
    code: 'DEPENDENCY_UNAVAILABLE',
    message,
    retryable: true,
  });
}
