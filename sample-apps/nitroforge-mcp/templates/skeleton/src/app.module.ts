import { McpApp, Module, ConfigModule } from '@nitrostack/core';

/**
 * templates/skeleton/src/app.module.ts — PLACEHOLDER.
 *
 * This file (and everything else under src/) is deleted and regenerated
 * from src/modules/forge/templates/*.hbs on every emission — see
 * emitter.service.ts STEP 1 ("copy skeleton, then clear src/"). What you're
 * looking at only exists so the bare skeleton is internally consistent
 * (typechecks, boots) if someone runs it directly without going through
 * the emitter.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'nitroforge-generated-server-placeholder',
    version: '0.0.0',
  },
  logging: {
    level: 'info',
  },
})
@Module({
  name: 'app',
  description: 'Placeholder root module — overwritten by the emitter',
  imports: [ConfigModule.forRoot()],
  providers: [],
})
export class AppModule {}
