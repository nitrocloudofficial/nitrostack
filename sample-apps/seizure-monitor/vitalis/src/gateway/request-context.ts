import { AsyncLocalStorage } from 'node:async_hooks';

export type RequestHeaders = Record<string, string | string[] | undefined>;

const requestStorage = new AsyncLocalStorage<RequestHeaders>();
const externalCallStorage = new AsyncLocalStorage<ExternalCallRecord[]>();

export interface ExternalCallRecord {
  api: string;
  path: string;
  status: number;
  latency_ms: number;
  error_code?: string;
}

export function runWithRequestHeaders<T>(headers: RequestHeaders, callback: () => T): T {
  return requestStorage.run(headers, callback);
}

export function getRequestHeaders(): RequestHeaders | undefined {
  return requestStorage.getStore();
}

export function runWithExternalCallContext<T>(callback: () => T): T {
  return externalCallStorage.run([], callback);
}

export function recordExternalCall(call: ExternalCallRecord): void {
  externalCallStorage.getStore()?.push(call);
}

export function getExternalCalls(): ExternalCallRecord[] {
  return [...(externalCallStorage.getStore() ?? [])];
}
