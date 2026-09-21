import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { MemoryModule } from './modules/memory/memory.module.js';

@McpApp({
  module: AppModule,
  server: {
    name: 'shared-agent-memory',
    version: '1.0.0',
  },
})
@Module({
  name: 'app',
  description: 'Root application module',
  imports: [
    ConfigModule.forRoot(),
    MemoryModule,
  ],
})
export class AppModule {}
