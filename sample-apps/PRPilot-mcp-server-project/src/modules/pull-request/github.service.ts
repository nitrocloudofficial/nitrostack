/**
 * PRPilot — GitHub REST API Service
 * Handles rate limits, network timeouts, unauthenticated public calls, and optional token auth.
 */

export interface GitHubErrorResponse {
  message?: string;
  documentation_url?: string;
}

export class GitHubService {
  private baseUrl = 'https://api.github.com';
  private defaultTimeoutMs = 10000;

  constructor(
    private token: string | undefined = process.env.GITHUB_TOKEN,
    private fetchImpl: typeof fetch = globalThis.fetch
  ) {}

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'PRPilot-MCP/1.0.0',
    };

    if (this.token && this.token.trim().length > 0) {
      headers.Authorization = `Bearer ${this.token.trim()}`;
    }

    return headers;
  }

  private async request<T>(endpoint: string): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.defaultTimeoutMs);

    try {
      const response = await this.fetchImpl(url, {
        headers: this.getHeaders(),
        signal: controller.signal,
      });

      const remaining = response.headers.get('x-ratelimit-remaining');
      const reset = response.headers.get('x-ratelimit-reset');

      if (!response.ok) {
        let errorData: GitHubErrorResponse = {};
        try {
          errorData = (await response.json()) as GitHubErrorResponse;
        } catch {
          // Response body was not JSON
        }

        if (response.status === 404) {
          throw new Error(`GitHub resource not found at ${endpoint}. Please verify owner, repo, and PR number.`);
        }

        if (response.status === 403 && remaining === '0') {
          const resetTime = reset ? new Date(parseInt(reset, 10) * 1000).toLocaleTimeString() : 'soon';
          throw new Error(
            `GitHub API rate limit exceeded. Rate limit resets at ${resetTime}. Set GITHUB_TOKEN in .env to increase allowance.`
          );
        }

        throw new Error(
          `GitHub API error (${response.status}): ${errorData.message || response.statusText || 'Unknown error'}`
        );
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`GitHub request timed out after ${this.defaultTimeoutMs}ms for ${endpoint}`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Fetch pull request details
   */
  async getPullRequest(owner: string, repo: string, pullNumber: number): Promise<any> {
    return this.request<any>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}`);
  }

  /**
   * Fetch files changed in a pull request
   */
  async getPullRequestFiles(owner: string, repo: string, pullNumber: number, perPage = 100): Promise<any[]> {
    return this.request<any[]>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}/files?per_page=${perPage}`
    );
  }

  /**
   * Fetch commit check runs for a specific commit SHA
   */
  async getCommitCheckRuns(owner: string, repo: string, ref: string): Promise<any> {
    try {
      return await this.request<any>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(ref)}/check-runs`
      );
    } catch (err) {
      return { total_count: 0, check_runs: [], error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Fetch commit statuses for a specific commit SHA
   */
  async getCommitStatuses(owner: string, repo: string, ref: string): Promise<any[]> {
    try {
      return await this.request<any[]>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(ref)}/statuses`
      );
    } catch {
      return [];
    }
  }

  /**
   * Fetch commit messages in a pull request
   */
  async getPullRequestCommits(owner: string, repo: string, pullNumber: number, perPage = 100): Promise<any[]> {
    try {
      return await this.request<any[]>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}/commits?per_page=${perPage}`
      );
    } catch {
      return [];
    }
  }

  /**
   * Fetch issue details for explicit issue reference tracing
   */
  async getIssue(owner: string, repo: string, issueNumber: number): Promise<any> {
    try {
      return await this.request<any>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}`
      );
    } catch {
      return null;
    }
  }
}
