import {
  Injectable,
  type Logger,
  NitroStackServer,
  type OnApplicationBootstrap,
} from '@nitrostack/core';
import { GitHubService } from './github.service.js';

/**
 * Registers browser OAuth callback routes against NitroStack's HTTP transport.
 */
@Injectable({ deps: [GitHubService, NitroStackServer, 'Logger'] })
export class GitHubBrowserAuthService implements OnApplicationBootstrap {
  constructor(
    private readonly githubService: GitHubService,
    private readonly server: NitroStackServer,
    private readonly logger: Logger,
  ) {}

  onApplicationBootstrap(): void {
    const httpTransport = (this.server as unknown as { _httpTransport?: { on?: Function } })._httpTransport;
    if (!httpTransport?.on) {
      this.logger.debug('GitHub browser OAuth callback route not registered: HTTP transport is unavailable.');
      return;
    }

    httpTransport.on('/auth/github/callback', async (req: any, res: any) => {
      const state = typeof req.query?.state === 'string' ? req.query.state : '';
      const code = typeof req.query?.code === 'string' ? req.query.code : undefined;
      const error = typeof req.query?.error === 'string' ? req.query.error : undefined;
      const errorDescription =
        typeof req.query?.error_description === 'string' ? req.query.error_description : undefined;

      try {
        await this.githubService.completeBrowserAuthorization({
          state,
          code,
          error,
          errorDescription,
        });

        res
          .status(200)
          .type('html')
          .send(this.renderCallbackPage('GitHub login complete', 'You can close this tab and return to the chat.'));
      } catch (callbackError) {
        const message = callbackError instanceof Error ? callbackError.message : String(callbackError);
        this.logger.warn('GitHub browser OAuth callback failed', { message });
        res
          .status(400)
          .type('html')
          .send(this.renderCallbackPage('GitHub login failed', message));
      }
    });

    this.logger.info('GitHub browser OAuth callback route registered at /auth/github/callback');
  }

  private renderCallbackPage(title: string, message: string): string {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${this.escapeHtml(title)}</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f6f8fa; color: #24292f; }
      main { width: min(520px, calc(100vw - 32px)); background: white; border: 1px solid #d0d7de; border-radius: 8px; padding: 28px; box-sizing: border-box; }
      h1 { font-size: 22px; line-height: 1.25; margin: 0 0 10px; }
      p { font-size: 15px; line-height: 1.5; margin: 0; color: #57606a; }
    </style>
  </head>
  <body>
    <main>
      <h1>${this.escapeHtml(title)}</h1>
      <p>${this.escapeHtml(message)}</p>
    </main>
  </body>
</html>`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
