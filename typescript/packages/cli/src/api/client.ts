import { loadConfig } from '../auth/token-store.js';

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
  constructor(
    public readonly apiUrl: string,
    public readonly token: string,
    private readonly customFetch: typeof fetch = fetch,
  ) {}

  /**
   * Factory method to initialize client using local credentials store or explicit options.
   */
  public static async create(options: StudioApiClientOptions = {}): Promise<StudioApiClient> {
    const config = await loadConfig();
    const token = options.token || config.token;
    const apiUrl = (options.apiUrl || config.apiUrl || 'https://api.nitrocloud.ai/api/v1').replace(/\/+$/, '');

    if (!token) {
      throw new StudioApiError(
        'No active session found. Please run "nitrostack login" to authenticate.',
        401,
      );
    }

    return new StudioApiClient(apiUrl, token, options.fetchFn || fetch);
  }

  /**
   * Dispatches authenticated HTTP requests to NitroCloud API endpoints.
   */
  public async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.apiUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    let response: Response;
    try {
      response = await this.customFetch(url, { ...options, headers });
    } catch (networkError) {
      throw new StudioApiError(
        `Failed to reach NitroCloud at ${url}: ${(networkError as Error).message}`,
        0,
        networkError,
      );
    }

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
}
