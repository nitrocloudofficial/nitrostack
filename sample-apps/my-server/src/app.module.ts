import { ConfigModule, McpApp, Module, OAuthModule } from '@nitrostack/core';
import { SystemHealthCheck } from './health/system.health.js';
import { DeploymentModule } from './modules/deployment/deployment.module.js';
import { GitHubModule } from './modules/github/github.module.js';

/**
 * Root application module for the GitHub Deploy Agent MCP server.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'github-deploy-agent',
    version: '1.0.0',
  },
  logging: {
    level: 'info',
  },
})
@Module({
  name: 'app',
  description: 'Root module for GitHub repository automation tools',
  imports: [
    ConfigModule.forRoot({
      ignoreEnvFile: true,
    }),
    OAuthModule.forRoot({
      required: process.env.OAUTH_REQUIRED === 'true',
      resourceUri:
        process.env.RESOURCE_URI ||
        process.env.NITROSTACK_PUBLIC_URL ||
        'https://mcplocal',
      authorizationServers: [
        process.env.AUTH_SERVER_URL || 'https://github.com',
      ],
      scopesSupported: [
        'repo',
        'read:user',
      ],
      http: {
        port: process.env.PORT ? Number(process.env.PORT) : undefined,
        host: process.env.HOST || '0.0.0.0',
        basePath: process.env.MCP_BASE_PATH || '/mcp',
      },
      jwksUri: process.env.JWKS_URI,
      tokenIntrospectionEndpoint: process.env.INTROSPECTION_ENDPOINT,
      tokenIntrospectionClientId: process.env.INTROSPECTION_CLIENT_ID,
      tokenIntrospectionClientSecret: process.env.INTROSPECTION_CLIENT_SECRET,
      audience: process.env.TOKEN_AUDIENCE,
      issuer: process.env.TOKEN_ISSUER,
    }),
    GitHubModule,
    DeploymentModule,
  ],
  providers: [
    SystemHealthCheck,
  ],
})
export class AppModule {}
