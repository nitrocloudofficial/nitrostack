import { Module } from '@nitrostack/core';
import { CodebaseTools } from './codebase.tools.js';
import { CodebaseService } from './codebase.service.js';

@Module({
  name: 'codebase',
  description: 'Structural Cartographer — dependency graph and architectural topography',
  controllers: [CodebaseTools],
  providers: [CodebaseService],
  exports: [CodebaseService],
})
export class CodebaseModule {}
