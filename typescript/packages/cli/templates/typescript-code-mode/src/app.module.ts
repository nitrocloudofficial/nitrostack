import { McpApp, Module, CodeModeTransform } from '@nitrostack/core';
import { DataController } from './controllers/data.controller.js';

/**
 * Root Application Module
 *
 * CodeModeTransform replaces the tool catalog with `search`, `get_schema`, and
 * `execute`. The model writes one script that calls the data tools inside a
 * QuickJS WebAssembly sandbox (see src/scripts/sample-batch.js).
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'code-mode-service',
    version: '1.0.0',
  },
  transforms: [
    new CodeModeTransform({
      workerPoolSize: 4,
      memoryLimitMb: 128,
      timeoutMs: 15000,
    }),
  ],
})
@Module({
  name: 'app',
  description: 'Code Mode service with QuickJS WebAssembly sandboxing',
  controllers: [DataController],
})
export class AppModule {}
