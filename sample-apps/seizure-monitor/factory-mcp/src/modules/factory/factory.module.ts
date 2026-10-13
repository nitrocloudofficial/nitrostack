import { Module } from '@nitrostack/core';
import { FactoryTools } from './factory.tools.js';
import { FactoryResources } from './factory.resources.js';
import { FactoryPrompts } from './factory.prompts.js';
import { DatabaseService } from '../../database/db.js';

@Module({
  name: 'factory',
  description: 'FactoryLens MCP Smart Factory Operations and Investigation Module',
  controllers: [FactoryTools, FactoryResources, FactoryPrompts],
  providers: [DatabaseService],
  exports: [DatabaseService]
})
export class FactoryModule {}
