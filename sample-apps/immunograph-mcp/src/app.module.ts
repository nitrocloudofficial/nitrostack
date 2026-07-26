import { McpApp, Module, ConfigModule, OAuthModule } from '@nitrostack/core';

import { ChemistryModule } from './modules/chemistry/chemistry.module.js';
import { ConstraintModule } from './modules/constraint/constraint.module.js';
import { DockingModule } from './modules/docking/docking.module.js';
import { EvidenceModule } from './modules/evidence/evidence.module.js';
import { CloudHealthRoute } from './modules/config/cloud-health-route.js';
import { PredictionModule } from './modules/prediction/prediction.module.js';
import { ReportModule } from './modules/report/report.module.js';
import { StructureModule } from './modules/structure/structure.module.js';
import { SystemHealthCheck } from './health/system.health.js';

const mcpPort = Number(process.env.MCP_SERVER_PORT ?? process.env.PORT ?? 3000);
const mcpHost = process.env.HOST ?? '0.0.0.0';
const resourceUri = process.env.RESOURCE_URI ?? `http://localhost:${mcpPort}`;
const authorizationServer =
  process.env.AUTH_SERVER_URL ?? process.env.TOKEN_ISSUER ?? 'https://auth.example.com';

@McpApp({
  module: AppModule,
  server: {
    name: 'immunograph-mcp',
    version: '1.0.0',
  },
  logging: {
    level: 'info',
  },
})
@Module({
  name: 'app',
  description: 'ImmunoGraph NitroCloud MCP application',
  imports: [
    ConfigModule.forRoot(),
    OAuthModule.forRoot({
      resourceUri,
      authorizationServers: [authorizationServer],
      scopesSupported: ['read', 'write'],
      audience: process.env.TOKEN_AUDIENCE,
      issuer: process.env.TOKEN_ISSUER,
      jwksUri: process.env.JWKS_URI,
      tokenIntrospectionEndpoint: process.env.INTROSPECTION_ENDPOINT,
      tokenIntrospectionClientId: process.env.INTROSPECTION_CLIENT_ID,
      tokenIntrospectionClientSecret: process.env.INTROSPECTION_CLIENT_SECRET,
      http: {
        port: mcpPort,
        host: mcpHost,
        basePath: '/mcp',
      },
    }),
    PredictionModule,
    EvidenceModule,
    ConstraintModule,
    StructureModule,
    ChemistryModule,
    DockingModule,
    ReportModule,
  ],
  providers: [SystemHealthCheck, CloudHealthRoute],
})
export class AppModule {}
