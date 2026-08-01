import { PlatformType } from '../shared/enums/platform.enum.js';
import { GMAIL_CONFIG } from '../integrations/gmail/config.js';

export interface OAuthCredentials {
  platform: PlatformType;
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  expiresAt?: number;
  tokenType?: string;
  scopes?: string[];
  redirectUri?: string;
  isAuthorized: boolean;
}

export class AuthenticationManagerService {
  private static instance: AuthenticationManagerService;
  private credentialsMap: Map<PlatformType, OAuthCredentials>;

  constructor() {
    this.credentialsMap = new Map();
    this.loadFromEnvironment();
  }

  public static getInstance(): AuthenticationManagerService {
    if (!AuthenticationManagerService.instance) {
      AuthenticationManagerService.instance = new AuthenticationManagerService();
    }
    return AuthenticationManagerService.instance;
  }

  private loadFromEnvironment(): void {
    // 1. Gmail Credentials
    const gmailAccessToken = process.env.GMAIL_ACCESS_TOKEN;
    const gmailRefreshToken = process.env.GMAIL_REFRESH_TOKEN;
    const gmailClientId = process.env.GMAIL_CLIENT_ID;
    const gmailClientSecret = process.env.GMAIL_CLIENT_SECRET;

    this.credentialsMap.set(PlatformType.GMAIL, {
      platform: PlatformType.GMAIL,
      clientId: gmailClientId,
      clientSecret: gmailClientSecret,
      accessToken: gmailAccessToken,
      refreshToken: gmailRefreshToken,
      tokenType: 'Bearer',
      scopes: GMAIL_CONFIG.scopes,
      redirectUri: process.env.GMAIL_REDIRECT_URI || GMAIL_CONFIG.defaultRedirectUri,
      isAuthorized: Boolean(gmailAccessToken || gmailRefreshToken)
    });

    // 2. Google Calendar Credentials
    const calAccessToken = process.env.GOOGLE_CALENDAR_ACCESS_TOKEN || gmailAccessToken;
    const calRefreshToken = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN || gmailRefreshToken;
    const calClientId = process.env.GOOGLE_CALENDAR_CLIENT_ID || gmailClientId;
    const calClientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET || gmailClientSecret;

    this.credentialsMap.set(PlatformType.CALENDAR, {
      platform: PlatformType.CALENDAR,
      clientId: calClientId,
      clientSecret: calClientSecret,
      accessToken: calAccessToken,
      refreshToken: calRefreshToken,
      tokenType: 'Bearer',
      isAuthorized: Boolean(calAccessToken || calRefreshToken)
    });

    // 3. GitHub Personal Access Token
    const ghToken = process.env.GITHUB_TOKEN;
    this.credentialsMap.set(PlatformType.GITHUB, {
      platform: PlatformType.GITHUB,
      accessToken: ghToken,
      isAuthorized: Boolean(ghToken)
    });

    // 4. Discord Bot Token
    const discordToken = process.env.DISCORD_BOT_TOKEN;
    this.credentialsMap.set(PlatformType.DISCORD, {
      platform: PlatformType.DISCORD,
      accessToken: discordToken,
      isAuthorized: Boolean(discordToken)
    });

    // 5. Slack Bot Token
    const slackToken = process.env.SLACK_BOT_TOKEN;
    this.credentialsMap.set(PlatformType.SLACK, {
      platform: PlatformType.SLACK,
      accessToken: slackToken,
      isAuthorized: Boolean(slackToken)
    });

    // 6. Notion API Token
    const notionToken = process.env.NOTION_API_TOKEN;
    this.credentialsMap.set(PlatformType.NOTION, {
      platform: PlatformType.NOTION,
      accessToken: notionToken,
      isAuthorized: Boolean(notionToken)
    });
  }

  public getCredentials(platform: PlatformType): OAuthCredentials {
    return this.credentialsMap.get(platform) || {
      platform,
      isAuthorized: false
    };
  }

  public setCredentials(platform: PlatformType, credentials: Partial<OAuthCredentials>): void {
    const existing = this.getCredentials(platform);
    const updated: OAuthCredentials = {
      ...existing,
      ...credentials,
      platform,
      isAuthorized: Boolean(
        credentials.accessToken || existing.accessToken || credentials.refreshToken || existing.refreshToken
      )
    };
    this.credentialsMap.set(platform, updated);
  }

  public isTokenExpired(platform: PlatformType, bufferSeconds: number = 300): boolean {
    const creds = this.getCredentials(platform);
    if (!creds.accessToken) return true;
    if (!creds.expiresAt) return false;
    return Date.now() >= creds.expiresAt - bufferSeconds * 1000;
  }

  public getGoogleAuthUrl(platform: PlatformType = PlatformType.GMAIL): string {
    const creds = this.getCredentials(platform);
    const clientId = creds.clientId || process.env.GMAIL_CLIENT_ID || '';
    const redirectUri = creds.redirectUri || GMAIL_CONFIG.defaultRedirectUri;
    const scopes = creds.scopes || GMAIL_CONFIG.scopes;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent'
    });

    return `${GMAIL_CONFIG.authUrl}?${params.toString()}`;
  }

  public async refreshGoogleAccessToken(platform: PlatformType = PlatformType.GMAIL): Promise<string> {
    const creds = this.getCredentials(platform);

    if (!creds.refreshToken) {
      const authUrl = this.getGoogleAuthUrl(platform);
      console.warn(`[OAuth Log] Cannot refresh token for ${platform}: Refresh token is missing.`);
      console.warn(`[OAuth Log] Action required: Authorize via Google OAuth Consent Screen at ${authUrl}`);
      throw new Error(`Missing refresh token for ${platform}. Re-authorization required: ${authUrl}`);
    }

    if (!creds.clientId || !creds.clientSecret) {
      console.warn(`[OAuth Log] Missing Client ID or Client Secret for ${platform}. Verify environment variables.`);
      throw new Error(`Missing Client ID or Secret for ${platform}.`);
    }

    console.log(`[OAuth Log] Initiating automatic token refresh for ${platform}...`);
    console.log(`[OAuth Log] OAuth Config: Client ID present, Token Endpoint: ${GMAIL_CONFIG.tokenUrl}`);

    try {
      const body = new URLSearchParams({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        refresh_token: creds.refreshToken,
        grant_type: 'refresh_token'
      });

      const response = await fetch(GMAIL_CONFIG.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[OAuth Log] Token refresh failed with HTTP ${response.status}: ${errorText}`);
        this.setCredentials(platform, { isAuthorized: false });
        const authUrl = this.getGoogleAuthUrl(platform);
        throw new Error(`Google OAuth token refresh failed (${response.status}): ${errorText}. Please re-authenticate at ${authUrl}`);
      }

      const tokenData = (await response.json()) as {
        access_token: string;
        expires_in: number;
        scope?: string;
        token_type?: string;
      };

      const expiresAt = Date.now() + tokenData.expires_in * 1000;
      const newScopes = tokenData.scope ? tokenData.scope.split(' ') : creds.scopes || GMAIL_CONFIG.scopes;

      this.setCredentials(platform, {
        accessToken: tokenData.access_token,
        expiresAt,
        tokenType: tokenData.token_type || 'Bearer',
        scopes: newScopes,
        isAuthorized: true
      });

      const logStatus = this.sanitizeLogData({
        platform,
        status: 'TOKEN_REFRESH_SUCCESS',
        expiresAt: new Date(expiresAt).toISOString(),
        expiresInSeconds: tokenData.expires_in,
        tokenType: tokenData.token_type || 'Bearer',
        grantedScopes: newScopes
      });

      console.log(`[OAuth Log] Token successfully refreshed for ${platform}:`, logStatus);
      return tokenData.access_token;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[OAuth Log] Exception during token refresh for ${platform}: ${errorMessage}`);
      throw err;
    }
  }

  public async ensureValidAccessToken(platform: PlatformType = PlatformType.GMAIL): Promise<string | undefined> {
    const creds = this.getCredentials(platform);

    if (this.isTokenExpired(platform) || !creds.accessToken) {
      if (creds.refreshToken) {
        console.log(`[OAuth Log] Access token for ${platform} is missing or expired. Triggering proactive refresh...`);
        return await this.refreshGoogleAccessToken(platform);
      }
    }

    return creds.accessToken;
  }

  public sanitizeLogData(data: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...data };
    const secretKeys = [
      'accessToken',
      'refreshToken',
      'clientSecret',
      'token',
      'authorization',
      'password',
      'access_token',
      'refresh_token',
      'client_secret'
    ];

    secretKeys.forEach((key) => {
      if (key in sanitized && typeof sanitized[key] === 'string') {
        const val = sanitized[key] as string;
        sanitized[key] = val.length > 8 ? `${val.substring(0, 4)}...[REDACTED]` : '[REDACTED_SECRET]';
      }
    });

    return sanitized;
  }
}
