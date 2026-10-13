import { Module } from '@nitrostack/core';
import { FactoryBrainPrompts } from './prompts/factorybrain.prompts.js';
import { FactoryBrainResources } from './resources/factorybrain.resources.js';
import { ServicesModule } from './services/services.module.js';

@Module({
  name: 'factorybrain-context',
  description: 'Versioned AI prompts and operational MCP resources',
  imports: [ServicesModule],
  controllers: [FactoryBrainPrompts, FactoryBrainResources],
})
export class FactoryBrainContextModule {}
