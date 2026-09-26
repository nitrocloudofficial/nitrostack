import {
  Injectable,
  NitroStackServer,
  type OnApplicationBootstrap,
} from '@nitrostack/core';

type HealthResponse = {
  json: (body: unknown) => void;
};

@Injectable({ deps: [NitroStackServer] })
export class CloudHealthRoute implements OnApplicationBootstrap {
  constructor(private readonly server: NitroStackServer) {}

  onApplicationBootstrap(): void {
    const transport = this.server.getHttpTransport();
    if (transport === undefined) return;

    const healthHandler = (_request: unknown, response: HealthResponse): void => {
      response.json({
        status: 'ok',
        service: 'immunograph-mcp',
        transport: 'streamable-http',
        mcpHealthPath: '/mcp/health',
      });
    };

    const app = transport.getApp?.();
    if (app === undefined) return;

    app.get('/health', healthHandler);
    app.get('/healthz', healthHandler);
    app.get('/ready', healthHandler);
  }
}
