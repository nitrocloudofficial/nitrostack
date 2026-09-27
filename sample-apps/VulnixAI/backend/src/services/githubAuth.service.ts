import axios from 'axios';
import { config } from '../config/env.js';
import type { GitHubUser } from '../types/auth.js';

export class GitHubAuthService {
  private static readonly GITHUB_API_URL = 'https://api.github.com';
  private static readonly GITHUB_OAUTH_URL = 'https://github.com/login/oauth';

  static getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: config.github.clientId,
      redirect_uri: config.github.callbackUrl,
      scope: 'read:user user:email repo',
      state,
    });

    return `${this.GITHUB_OAUTH_URL}/authorize?${params.toString()}`;
  }

  static async getAccessToken(code: string): Promise<string> {
    try {
      const response = await axios.post(
        `${this.GITHUB_OAUTH_URL}/access_token`,
        {
          client_id: config.github.clientId,
          client_secret: config.github.clientSecret,
          code,
          redirect_uri: config.github.callbackUrl,
        },
        {
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (response.data.error) {
        throw new Error(response.data.error_description || 'Failed to get access token');
      }

      return response.data.access_token;
    } catch (error) {
      console.error('Error getting access token:', error);
      throw new Error('Failed to authenticate with GitHub');
    }
  }

  static async getUserData(accessToken: string): Promise<GitHubUser> {
    try {
      const [userResponse, emailsResponse] = await Promise.all([
        axios.get(`${this.GITHUB_API_URL}/user`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }),
        axios.get(`${this.GITHUB_API_URL}/user/emails`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }),
      ]);

      const user = userResponse.data;
      const emails = emailsResponse.data;
      const primaryEmail = emails.find((email: any) => email.primary)?.email || user.email;

      return {
        id: user.id,
        login: user.login,
        name: user.name || user.login,
        email: primaryEmail,
        avatar_url: user.avatar_url,
        bio: user.bio,
        company: user.company,
        location: user.location,
      };
    } catch (error) {
      console.error('Error getting user data:', error);
      throw new Error('Failed to fetch user data from GitHub');
    }
  }

  static async getUserRepositories(accessToken: string): Promise<any[]> {
    try {
      if (accessToken === 'mock-access-token') {
        // Return mock developer repositories for offline testing
        return [
          {
            id: '1',
            name: 'Vulnix-App',
            fullName: 'mock_developer/Vulnix-App',
            description: 'Vulnerability Detection and Security Monitoring AI Platform',
            isPrivate: true,
            language: 'TypeScript',
            stars: 12,
            forks: 2,
            updatedAt: new Date().toLocaleDateString(),
            url: 'https://github.com/mock_developer/Vulnix-App',
            defaultBranch: 'main',
          },
          {
            id: '2',
            name: 'Vulnerable-Node-API',
            fullName: 'mock_developer/Vulnerable-Node-API',
            description: 'An intentionally vulnerable API for testing security tools',
            isPrivate: false,
            language: 'JavaScript',
            stars: 84,
            forks: 15,
            updatedAt: new Date().toLocaleDateString(),
            url: 'https://github.com/mock_developer/Vulnerable-Node-API',
            defaultBranch: 'master',
          }
        ];
      }

      const response = await axios.get(`${this.GITHUB_API_URL}/user/repos`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
        params: {
          sort: 'updated',
          per_page: 100,
          affiliation: 'owner,collaborator,organization_member',
        },
      });

      return response.data.map((repo: any) => ({
        id: repo.id.toString(),
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        isPrivate: repo.private,
        language: repo.language || 'Unknown',
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        updatedAt: new Date(repo.updated_at).toLocaleDateString(),
        url: repo.html_url,
        defaultBranch: repo.default_branch,
      }));
    } catch (error: any) {
      const status = error?.response?.status;
      const msg = error?.response?.data?.message || error?.message;
      console.error('Error getting user repositories:', status, msg);
      if (status === 401) {
        throw new Error('GitHub token is invalid or expired. Please re-authenticate.');
      }
      throw new Error(`Failed to fetch repositories from GitHub: ${msg || 'unknown error'}`);
    }
  }

  static async getRepositoryBranches(owner: string, repo: string, accessToken: string): Promise<any[]> {
    try {
      if (accessToken === 'mock-access-token') {
        return [
          {
            name: 'main',
            protected: false,
            commit: {
              sha: '1234567890abcdef1234567890abcdef12345678',
              url: 'https://api.github.com/repos/mock_developer/mock/commits/12345678',
            },
          },
          {
            name: 'dev',
            protected: false,
            commit: {
              sha: 'abcdef1234567890abcdef1234567890abcdef12',
              url: 'https://api.github.com/repos/mock_developer/mock/commits/abcdef12',
            },
          }
        ];
      }

      const response = await axios.get(`${this.GITHUB_API_URL}/repos/${owner}/${repo}/branches`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
        params: {
          per_page: 100,
        },
      });

      return response.data.map((branch: any) => ({
        name: branch.name,
        protected: branch.protected,
        commit: {
          sha: branch.commit.sha,
          url: branch.commit.url,
        },
      }));
    } catch (error) {
      console.error('Error getting repository branches:', error);
      throw new Error('Failed to fetch branches from GitHub');
    }
  }
}
