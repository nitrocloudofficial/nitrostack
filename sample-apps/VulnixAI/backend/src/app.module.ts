import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { ScanModule } from './modules/scan/scan.module.js';

const isProd = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

@McpApp({
  module: AppModule,
  server: {
    name: 'vulnix-analyzer',
    version: '1.0.0',
  },
  transport: {
    type: 'http',
    http: {
      port: Number(process.env.PORT) || 5000,
      host: isProd ? '0.0.0.0' : 'localhost',
    },
  },
  logging: {
    level: 'info',
  },
})
@Module({
  name: 'app',
  description: 'VulnixAI MCP Server root module',
  imports: [
    ConfigModule.forRoot(),
    ScanModule,
  ],
})
export class AppModule {}
