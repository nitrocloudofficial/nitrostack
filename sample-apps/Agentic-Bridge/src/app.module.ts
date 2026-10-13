import { McpApp, Module, ConfigModule } from '@nitrostack/core';

import { resolveTransportType } from './shared/transport.js';
import { SharedModule } from './shared/shared.module.js';
import { CodebaseModule } from './modules/codebase/codebase.module.js';
import { DocumentationModule } from './modules/documentation/documentation.module.js';
import { QaModule } from './modules/qa/qa.module.js';
import { DevOpsModule } from './modules/devops/devops.module.js';
import { UiUxModule } from './modules/uiux/uiux.module.js';
import { AgileModule } from './modules/agile/agile.module.js';
import { ConflictModule } from './modules/conflict/conflict.module.js';
import { SkillsModule } from './modules/skills/skills.module.js';
import { PipelineModule } from './modules/pipeline/pipeline.module.js';
import { SynthesisModule } from './modules/synthesis/synthesis.module.js';
import { SwarmModule } from './modules/swarm/swarm.module.js';
import { BridgeModule } from './modules/bridge/bridge.module.js';
import {
  SystemHealthCheck,
  FixtureHealthCheck,
  KnowledgeHealthCheck,
  SecurityHealthCheck,
  LiveDataHealthCheck,
} from './health/system.health.js';

/**
 * Enterprise Agentic Bridge — root module.
 *
 * The domain layout mirrors the swarm personas one-to-one, so a reviewer can map
 * "Structural Cartographer" straight onto `modules/codebase` and find its tool,
 * its service and its module in one directory.
 *
 * Transport: STDIO by default — that is what NitroStudio spawns. Switches to
 * HTTP when NODE_ENV=production or BRIDGE_TRANSPORT=http, which is what
 * NitroCloud runs, what the ChatGPT connector needs, and what the admin
 * dashboard talks to over HTTP/SSE.
 *
 * The block below is declarative documentation of that intent, but it is not
 * what NitroStack 1.0.x actually reads: `NitroStackServer.start()` selects the
 * transport from MCP_TRANSPORT_TYPE / NODE_ENV and takes the port and host from
 * PORT / HOST, ignoring `@McpApp.transport` entirely. `resolveTransport()` in
 * index.ts translates BRIDGE_TRANSPORT into the variables the framework honours,
 * before start(). Keep the two in step if either side changes.
 */
const transportType = resolveTransportType();

@McpApp({
  module: AppModule,
  server: {
    name: 'enterprise-agentic-bridge',
    version: '1.0.0',
  },
  transport: {
    type: transportType,
    http: {
      port: Number(process.env.PORT ?? 8080),
      host: process.env.HOST ?? '0.0.0.0',
      basePath: '/mcp',
    },
  },
  logging: {
    level: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') ?? 'info',
  },
})
@Module({
  name: 'app',
  description: 'Enterprise Agentic Bridge — legacy codebase to machine-readable context',
  imports: [
    ConfigModule.forRoot(),
    SharedModule,

    // Reconnaissance personas
    CodebaseModule,
    DocumentationModule,
    QaModule,
    DevOpsModule,
    UiUxModule,
    AgileModule,

    // Synthesis and control
    ConflictModule,
    SkillsModule,
    PipelineModule,
    SynthesisModule,
    SwarmModule,
    BridgeModule,
  ],
  providers: [
    SystemHealthCheck,
    FixtureHealthCheck,
    KnowledgeHealthCheck,
    SecurityHealthCheck,
    LiveDataHealthCheck,
  ],
})
export class AppModule {}
