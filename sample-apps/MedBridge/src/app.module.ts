import { McpApp, Module } from '@nitrostack/core';
import { MedBridgeModule } from './modules/medbridge/medbridge.module.js';

@Module({
  name: 'AppModule',
  imports: [MedBridgeModule],
})
@McpApp({
  server: {
    name: 'medbridge',
    version: '1.0.0',
  },
  logging: {
    level: 'info',
  },
  module: MedBridgeModule,
})
export class AppModule {}
