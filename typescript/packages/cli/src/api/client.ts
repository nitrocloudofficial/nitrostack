import { loadConfig, DEFAULT_API_URL } from '../auth/token-store.js';

export interface StudioOrganization {
  _id: string;
  id?: string;
  name: string;
  slug?: string;
  description?: string;
  role?: string;
}

export interface StudioApp {
  _id: string;
  id?: string;
  name: string;
  description?: string;
  organizationId: string;
  subdomain?: string;
  createdAt?: string;
}

export interface CreateAppInput {
  name: string;
  organizationId: string;
  description?: string;
}

export interface StudioApiClientOptions {
  apiUrl?: string;
  token?: string;
  fetchFn?: typeof fetch;
  /** Per-request timeout in ms (default 60s). */
  timeoutMs?: number;
  /** Max attempts for idempotent/retryable requests (default 3). */
  maxAttempts?: number;
}

export class StudioApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly details?: any,
  ) {
    super(message);
    this.name = 'StudioApiError';
  }
}

/**
 * Typed HTTP client for interacting with NitroCloud Studio APIs with bearer authentication.
 */
export class StudioApiClient {
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;

  constructor(
    public readonly apiUrl: string,
    public readonly token: string,
    private readonly customFetch: typeof fetch = fetch,
    timeoutMs: number = 60_000,
    maxAttempts: number = 3,
  ) {
    this.timeoutMs = timeoutMs;
    this.maxAttempts = maxAttempts;
  }

  /**
   * Factory method to initialize client using local credentials store or explicit options.
   */
  public static async create(options: StudioApiClientOptions = {}): Promise<StudioApiClient> {
    const config = await loadConfig();
    const token = options.token || config.token;
    const apiUrl = (options.apiUrl || config.apiUrl || DEFAULT_API_URL).replace(/\/+$/, '');

    if (!token) {
      throw new StudioApiError(
        'No active session found. Please run "nitrostack login" to authenticate.',
        401,
      );
    }

    return new StudioApiClient(
      apiUrl,
      token,
      options.fetchFn || fetch,
      options.timeoutMs,
      options.maxAttempts,
    );
  }

  /**
   * Dispatches authenticated HTTP requests to NitroCloud API endpoints.
   */
  public async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.apiUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const method = (options.method || 'GET').toUpperCase();
    const retryableMethod = method === 'GET' || method === 'HEAD';
    const maxAttempts = retryableMethod ? this.maxAttempts : 1;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      const signal = options.signal
        ? anySignal([options.signal, controller.signal])
        : controller.signal;

      try {
        const response = await this.customFetch(url, { ...options, headers, signal });

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          let errorBody: any;

          try {
            errorBody = await response.json();
            if (errorBody?.message) {
              errorMessage = Array.isArray(errorBody.message)
                ? errorBody.message.join(', ')
                : String(errorBody.message);
            } else if (errorBody?.error) {
              errorMessage = String(errorBody.error);
            }
          } catch {}

          const retryableStatus =
            response.status === 429 || response.status === 502 || response.status === 503;
          if (retryableMethod && retryableStatus && attempt < maxAttempts) {
            await sleep(Math.min(500 * 2 ** (attempt - 1), 5000));
            continue;
          }

          if (response.status === 401) {
            throw new StudioApiError(
              'Session expired or invalid. Run "nitrostack login" to re-authenticate.',
              401,
              errorBody,
            );
          }
          if (response.status === 403) {
            throw new StudioApiError(`Permission denied: ${errorMessage}`, 403, errorBody);
          }
          if (response.status === 404) {
            throw new StudioApiError(`Resource not found: ${errorMessage}`, 404, errorBody);
          }

          throw new StudioApiError(errorMessage, response.status, errorBody);
        }

        // Handle 204 No Content
        if (response.status === 204) {
          return {} as T;
        }

        const payload = (await response.json()) as any;
        return (payload?.data !== undefined ? payload.data : payload) as T;
      } catch (networkError) {
        if (networkError instanceof StudioApiError) {
          throw networkError;
        }
        lastError =
          networkError instanceof Error ? networkError : new Error(String(networkError));
        if (attempt < maxAttempts && retryableMethod) {
          await sleep(Math.min(500 * 2 ** (attempt - 1), 5000));
          continue;
        }
        throw new StudioApiError(
          `Failed to reach NitroCloud at ${url}: ${lastError.message}`,
          0,
          lastError,
        );
      } finally {
        clearTimeout(timer);
      }
    }

    throw new StudioApiError(
      `Failed to reach NitroCloud at ${url}: ${lastError?.message || 'unknown error'}`,
      0,
      lastError,
    );
  }

  /**
   * Retrieves all organizations accessible to the authenticated user.
   */
  public async getOrganizations(): Promise<StudioOrganization[]> {
    try {
      return await this.request<StudioOrganization[]>('/studio/organizations');
    } catch (err) {
      if (err instanceof StudioApiError && err.statusCode === 404) {
        return await this.request<StudioOrganization[]>('/organizations');
      }
      throw err;
    }
  }

  /**
   * Retrieves deployable NitroStack apps within a specified organization.
   */
  public async getOrganizationApps(organizationId: string): Promise<StudioApp[]> {
    try {
      return await this.request<StudioApp[]>(`/studio/organizations/${organizationId}/apps`);
    } catch (err) {
      if (err instanceof StudioApiError && err.statusCode === 404) {
        return await this.request<StudioApp[]>(`/apps/organization/${organizationId}`);
      }
      throw err;
    }
  }

  /**
   * Creates a new NitroStack application inside an organization.
   */
  public async createApp(dto: CreateAppInput): Promise<StudioApp> {
    try {
      return await this.request<StudioApp>('/studio/apps', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    } catch (err) {
      if (err instanceof StudioApiError && err.statusCode === 404) {
        return await this.request<StudioApp>('/apps', {
          method: 'POST',
          body: JSON.stringify(dto),
        });
      }
      throw err;
    }
  }

  /**
   * Retrieves decrypted environment variables for an application from NitroCloud's vault.
   */
  public async getAppEnv(appId: string): Promise<Record<string, string>> {
    try {
      return await this.request<Record<string, string>>(`/studio/apps/${appId}/env`);
    } catch (err) {
      if (err instanceof StudioApiError && err.statusCode === 404) {
        return await this.request<Record<string, string>>(`/apps/${appId}/env`);
      }
      throw err;
    }
  }

  /**
   * Encrypts and persists environment variables into NitroCloud's OpenBao vault.
   */
  public async updateAppEnv(
    appId: string,
    env: Record<string, string>,
  ): Promise<Record<string, string>> {
    try {
      return await this.request<Record<string, string>>(`/studio/apps/${appId}/env`, {
        method: 'PUT',
        body: JSON.stringify({ env }),
      });
    } catch (err) {
      if (err instanceof StudioApiError && err.statusCode === 404) {
        return await this.request<Record<string, string>>(`/apps/${appId}/env`, {
          method: 'PUT',
          body: JSON.stringify({ env }),
        });
      }
      throw err;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }
  return controller.signal;
}

