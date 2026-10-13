import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { FinlyModule } from './modules/finly/finly.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Finly — plain-language money guidance, as an MCP app.
 *
 * The host holds the conversation in whatever language the user speaks and
 * decides which tool to call. These tools compute verified figures and render
 * them as widgets, so no number a user sees is produced by a language model.
 *
 * Note what is deliberately absent: any tool that recommends a financial
 * product. Naming a specific fund or policy to buy is restricted to
 * SEBI-registered advisers in India, so the capability does not exist here
 * rather than being offered and then refused.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'finly',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Plain-language money checks with verified figures',
  imports: [
    ConfigModule.forRoot(),
    FinlyModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}
