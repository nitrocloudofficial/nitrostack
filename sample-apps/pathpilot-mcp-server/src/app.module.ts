import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { PathPilotModule } from './modules/pathpilot/pathpilot.module.js';
import { SystemHealthCheck } from './health/system.health.js';

@McpApp({
  module: AppModule,
  server: {
    name: 'pathpilot-evidence-server',
    version: '1.1.0',
  },
  logging: {
    level: 'info',
  },
})
@Module({
  name: 'app',
  description: 'PathPilot root application — MCP evidence fusion server for career roadmap adaptation.',
  imports: [ConfigModule.forRoot(), PathPilotModule],
  providers: [SystemHealthCheck],
})
export class AppModule {}

// Module-level side-effect: auto-start the standalone HTTP REST listener
// (NitroStack dev boots from the McpApp decorator loader, not src/index.ts,
// so index.ts's bootstrap() never runs in HMR — this ensures port 3002
// is reachable by the widget proxy routes during local development.)
//
// Uses a deferred dynamic import() to break the circular dependency:
//   app.module → restServer → pathpilotService → pathpilot.module → app.module
// which caused transient "TypeScript error - check your code" spam during HMR.
setTimeout(() => {
  import('./infrastructure/restServer.js')
    .then((m) => m?.restServer?.start?.())
    .catch((err: any) => {
      console.warn('[PathPilot] REST server could not start (MCP + widgets still OK):', err instanceof Error ? err.message : String(err));
    });
}, 250);

