import {
  McpApp,
  Module,
  ConfigModule
} from '@nitrostack/core';

import { CalculatorModule } from './modules/calculator/calculator.module.js';
import { ScamShieldModule } from './modules/scamshield/scamshield.module.js';
import { SystemHealthCheck } from './health/system.health.js';

@McpApp({
  module: AppModule,
  server: {
    name: 'scamshield-server',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'ScamShield AI fraud prevention MCP server',
  imports: [
    ConfigModule.forRoot(),
    CalculatorModule,
    ScamShieldModule
  ],
  controllers: [
    SystemHealthCheck
  ]
})
export class AppModule {}