import { McpApp } from '@nitrostack/core';
import { CodeModeTransform } from '@nitrostack/core/transforms';
import { DataController } from './controllers/data.controller.js';

@McpApp({
  name: 'code-mode-service',
  version: '1.0.0',
  description: 'Code Mode service with QuickJS WebAssembly sandboxing',
  controllers: [DataController],
  transforms: [
    new CodeModeTransform({
      workerPoolSize: 4,
      memoryLimitMb: 128,
      timeoutMs: 15000,
    }),
  ],
})
export class CodeModeApp {}
