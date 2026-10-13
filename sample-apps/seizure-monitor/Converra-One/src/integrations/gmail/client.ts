import { RateLimiterService } from '../../services/RateLimiter.service.js';
import { AuthenticationManagerService } from '../../services/AuthenticationManager.service.js';
import { PlatformType } from '../../shared/enums/platform.enum.js';
import { DemoStoreService } from '../../services/DemoStore.service.js';
import { GmailMessage } from './types.js';


export class GmailClient {
  private rateLimiter: RateLimiterService;
  private authManager: AuthenticationManagerService;

  constructor() {
    this.rateLimiter = RateLimiterService.getInstance();
    this.authManager = AuthenticationManagerService.getInstance();
  }

  public async fetchMessages(): Promise<GmailMessage[]> {
    return this.rateLimiter.executeWithRateLimit(PlatformType.GMAIL, async () => {
      // 1. Proactive Token Refresh & Expiration Check
      let accessToken: string | undefined;
      try {
        accessToken = await this.authManager.ensureValidAccessToken(PlatformType.GMAIL);
      } catch (err) {
        console.warn(
          '[GmailClient Log] Proactive token validation/refresh failed:',
          err instanceof Error ? err.message : err
        );
      }

      const creds = this.authManager.getCredentials(PlatformType.GMAIL);

      if (!creds.isAuthorized || !accessToken) {
        console.log('[GmailClient Log] OAuth status: NOT_AUTHORIZED / NO_ACCESS_TOKEN. Using fallback payload.');
        return this.getFallbackMessages();
      }

      const sanitizedStatus = this.authManager.sanitizeLogData({
        platform: PlatformType.GMAIL,
        accessToken,
        expiresAt: creds.expiresAt ? new Date(creds.expiresAt).toISOString() : 'N/A',
        scopes: creds.scopes || []
      });
      console.log('[GmailClient Log] Active OAuth Token Status:', sanitizedStatus);

      // 2. Execute Request with Reactive 401 Automatic Refresh & Single Retry
      try {
        return await this.executeFetchMessages(accessToken);
      } catch (err: unknown) {
        const is401 =
          (typeof err === 'object' && err !== null && 'status' in err && (err as { status: number }).status === 401) ||
          (err instanceof Error && err.message.includes('401'));

        if (is401) {
          console.warn('[GmailClient Log] Received HTTP 401 Unauthorized (invalid_token). Attempting reactive token refresh...');
          try {
            const refreshedToken = await this.authManager.refreshGoogleAccessToken(PlatformType.GMAIL);
            console.log('[GmailClient Log] Token refreshed successfully following 401 error. Retrying Gmail API call...');
            return await this.executeFetchMessages(refreshedToken);
          } catch (refreshErr) {
            console.error(
              '[GmailClient Log] Reactive token refresh failed following 401 error:',
              refreshErr instanceof Error ? refreshErr.message : refreshErr
            );
            const authUrl = this.authManager.getGoogleAuthUrl(PlatformType.GMAIL);
            console.warn(`[GmailClient Log] Redirecting user to Google OAuth Consent Screen: ${authUrl}`);
            return this.getFallbackMessages();
          }
        }

        console.error('[GmailClient Log] Non-401 error during Gmail API request:', err instanceof Error ? err.message : err);
        return this.getFallbackMessages();
      }
    });
  }

  private async executeFetchMessages(token: string): Promise<GmailMessage[]> {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      throw { status: 401, message: 'Access token is undefined, null, or empty' };
    }

    const headers = {
      Authorization: `Bearer ${token.trim()}`,
      Accept: 'application/json'
    };

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10', {
      headers
    });

    if (res.status === 401) {
      const text = await res.text();
      throw { status: 401, message: `Gmail API HTTP 401 Unauthorized: ${text}` };
    }

    if (!res.ok) {
      throw new Error(`Gmail API HTTP Error ${res.status}`);
    }

    const data = (await res.json()) as { messages?: { id: string }[] };
    if (!data.messages) return [];

    const details = await Promise.all(
      data.messages.map(async (m) => {
        const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}`, {
          headers
        });
        if (detailRes.status === 401) {
          throw { status: 401, message: 'Gmail API HTTP 401 Unauthorized on message details' };
        }
        return detailRes.json() as Promise<GmailMessage>;
      })
    );

    return details;
  }

  private getFallbackMessages(): GmailMessage[] {
    const demoMsgs = DemoStoreService.getInstance().getMessagesByPlatform(PlatformType.GMAIL);
    return demoMsgs.map(m => ({
      id: m.externalId || m.id,
      threadId: m.conversationId,
      snippet: m.content,
      payload: {
        mimeType: 'text/plain',
        headers: [
          { name: 'Subject', value: m.subject || '' },
          { name: 'From', value: `${m.sender.name || ''} <${m.sender.email || ''}>` }
        ]
      },
      internalDate: `${new Date(m.timestamp).getTime()}`,
      labelIds: m.status === 'UNREAD' ? ['UNREAD', 'IMPORTANT'] : ['IMPORTANT']
    }));
  }
}

