import { McpApp, Module } from '@nitrostack/core';
import { BrowserModule } from './modules/browser/browser.module.js';

@McpApp({
  module: AppModule,
  server: {
    name: 'browser-mcp',
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
    BrowserModule
  ]
})
export class AppModule {}
