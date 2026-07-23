import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { InvoicexrayModule } from './modules/invoicexray/invoicexray.module.js';
import { SystemHealthCheck } from './health/system.health.js';
import { DatabaseHealthCheck } from './health/database.health.js';

@McpApp({
  module: AppModule,
  server: {
    name: 'invoicex-ray',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Root application module',
  imports: [
    ConfigModule.forRoot(),
    InvoicexrayModule
  ],
  providers: [
    SystemHealthCheck,
    DatabaseHealthCheck
  ]
})
export class AppModule {}
