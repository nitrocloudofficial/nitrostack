import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { ShoeFitModule } from './modules/shoe-fit/shoe-fit.module.js';
import { ShoesModule } from './modules/shoes/shoes.module.js';
import { SystemHealthCheck } from './health/system.health.js';

@McpApp({
  module: AppModule,
  server: {
    name: 'shoefit-server',
    version: '2.1.0',
  },
  transport: {
    type: 'http',
    http: {
      port: 3000,
      basePath: '/mcp'
    }
  },
  logging: {
    level: 'info',
  },
})
@Module({
  name: 'app',
  description: 'ShoeFit — foot measurement and shoe matching MCP server',
  imports: [ConfigModule.forRoot(), ShoeFitModule, ShoesModule],
  providers: [SystemHealthCheck],
})
export class AppModule {}
