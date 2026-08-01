import { McpApp, Module } from '@nitrostack/core';
import { SystemTools } from './system.tools.js';
import { StartupTools } from './startup.tools.js';
import { CleanupTools } from './cleanup.tools.js';
import { NetworkTools } from './network.tools.js';
import { BoostTools } from './boost.tools.js';
import { PromptsController } from './prompts.tools.js';
@McpApp({
  module: AppModule,
  server: { name: 'apextune-server', version: '1.0.0' }
})
@Module({
  name: 'AppModule',
  controllers: [SystemTools, StartupTools, CleanupTools, NetworkTools, BoostTools, PromptsController],
})
export class AppModule {}


