import { Injectable } from '@nitrostack/core';
import { loadMlServiceConfig, type MlServiceConfig } from '../../config/environment.js';
import {
  mlServiceHealthSchema,
  mlServiceAnalysisSchema,
  mlServiceProfileSchema,
  type MlServiceHealth,
  type MlServiceAnalysis,
  type MlServiceProfile,
} from './ml-client.schemas.js';
import type { AnalysisPlan } from '../analysis/analysis.schemas.js';

interface HttpResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export type FetchImplementation = (
  input: string,
  init: { headers: Record<string, string>; signal: AbortSignal; method?: string; body?: FormData },
) => Promise<HttpResponse>;

export type RetryDelay = (milliseconds: number) => Promise<void>;

export class MlServiceError extends Error {
  constructor(
    public readonly code: 'timeout' | 'unavailable' | 'validation_error' | 'upstream_error' | 'invalid_response',
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'MlServiceError';
  }
}

const defaultFetch: FetchImplementation = (input, init) => fetch(input, init);
const defaultRetryDelay: RetryDelay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

@Injectable({ deps: [] })
export class MlClientService {
  private config: MlServiceConfig;
  private fetchImplementation: FetchImplementation;
  private retryDelay: RetryDelay;

  constructor() {
    this.config = loadMlServiceConfig();
    this.fetchImplementation = defaultFetch;
    this.retryDelay = defaultRetryDelay;
  }

  static forTesting(
    config: MlServiceConfig,
    fetchImplementation: FetchImplementation = defaultFetch,
    retryDelay: RetryDelay = defaultRetryDelay,
  ): MlClientService {
    const service = Object.create(MlClientService.prototype) as MlClientService;
    service.config = config;
    service.fetchImplementation = fetchImplementation;
    service.retryDelay = retryDelay;
    return service;
  }

  async health(requestId?: string): Promise<MlServiceHealth> {
    const response = await this.request('/health', 'health', {}, requestId);

    const payload = await this.readJson(response, 'health');
    const parsed = mlServiceHealthSchema.safeParse(payload);
    if (!parsed.success) {
      throw new MlServiceError('invalid_response', 'ML service returned an invalid health response.');
    }

    return parsed.data;
  }

  async profile(datasetId: string, csv: Buffer, requestId?: string): Promise<MlServiceProfile> {
    const body = new FormData();
    body.set('dataset_id', datasetId);
    body.set('file', new Blob([csv], { type: 'text/csv' }), `${datasetId}.csv`);

    const response = await this.request('/v1/profile', 'profile', {
      method: 'POST',
      body,
    }, requestId);

    const payload = await this.readJson(response, 'profile');
    const parsed = mlServiceProfileSchema.safeParse(payload);
    if (!parsed.success) {
      throw new MlServiceError('invalid_response', 'ML service returned an invalid profile response.');
    }

    return parsed.data;
  }

  async analyze(plan: AnalysisPlan, csv: Buffer, requestId?: string): Promise<MlServiceAnalysis> {
    const body = new FormData();
    body.set('plan', JSON.stringify(plan));
    body.set('file', new Blob([csv], { type: 'text/csv' }), `${plan.datasetId}.csv`);

    const response = await this.request('/v1/analyze', 'analysis', {
      method: 'POST',
      body,
    }, requestId);
    const payload = await this.readJson(response, 'analysis');
    const parsed = mlServiceAnalysisSchema.safeParse(payload);
    if (!parsed.success) {
      throw new MlServiceError('invalid_response', 'ML service returned an invalid analysis response.');
    }
    return parsed.data;
  }

  private async request(
    path: string,
    operation: 'health' | 'profile' | 'analysis' = 'health',
    request: { method?: string; body?: FormData } = {},
    requestId?: string,
  ): Promise<HttpResponse> {
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt += 1) {
      try {
        const response = await this.requestOnce(path, request, requestId);
        if (response.ok) return response;
        if (this.isRetryableStatus(response.status) && attempt < this.config.maxRetries) {
          await this.retryDelay(250);
          continue;
        }
        throw await this.httpError(response, operation);
      } catch (error) {
        if (error instanceof MlServiceError) throw error;
        if (error instanceof Error && error.name === 'AbortError') {
          throw new MlServiceError('timeout', `ML service ${operation} request timed out.`);
        }
        if (attempt < this.config.maxRetries) {
          await this.retryDelay(250);
          continue;
        }
        throw new MlServiceError('unavailable', 'ML service is temporarily unavailable. Please try again shortly.');
      }
    }
    throw new MlServiceError('unavailable', 'ML service is temporarily unavailable. Please try again shortly.');
  }

  private async requestOnce(
    path: string,
    request: { method?: string; body?: FormData },
    requestId?: string,
  ): Promise<HttpResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      return await this.fetchImplementation(`${this.config.baseUrl}${path}`, {
        headers: {
          authorization: `Bearer ${this.config.apiKey}`,
          ...(requestId ? { 'x-request-id': requestId } : {}),
        },
        signal: controller.signal,
        ...request,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private isRetryableStatus(status: number): boolean {
    return status >= 500 && status <= 599;
  }

  private async httpError(response: HttpResponse, operation: 'health' | 'profile' | 'analysis'): Promise<MlServiceError> {
    if (response.status >= 400 && response.status < 500 && response.status !== 401 && response.status !== 403) {
      return new MlServiceError('validation_error', await this.safeDetail(response, operation), response.status);
    }
    if (response.status === 401 || response.status === 403) {
      return new MlServiceError('upstream_error', 'ML service rejected the request.', response.status);
    }
    return new MlServiceError('upstream_error', `ML service ${operation} is temporarily unavailable.`, response.status);
  }

  private async safeDetail(response: HttpResponse, operation: 'health' | 'profile' | 'analysis'): Promise<string> {
    try {
      const payload = await response.json();
      if (typeof payload === 'object' && payload !== null && 'detail' in payload && typeof payload.detail === 'string') {
        return payload.detail.slice(0, 240);
      }
    } catch {
      // Fall through to a generic, operation-specific message.
    }
    return `ML service ${operation} request could not be completed.`;
  }

  private async readJson(response: HttpResponse, operation: 'health' | 'profile' | 'analysis'): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      throw new MlServiceError('invalid_response', `ML service returned an invalid ${operation} response.`);
    }
  }
}
