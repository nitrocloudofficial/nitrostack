import { McpApp, Module } from '@nitrostack/core';
import { K8sTestModule } from './modules/k8s-test/k8s-test.module.js';

@McpApp({
  module: AppModule,
  server: {
    name: 'k8s-test-mcp',
    version: '1.0.0'
  },
  logging: {
    level: 'error'
  }
})
@Module({
  name: 'app',
  description: 'Root application module',
  imports: [
    K8sTestModule
  ]
})
export class AppModule {}
