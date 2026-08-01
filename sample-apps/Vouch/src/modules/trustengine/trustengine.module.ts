import { Module } from '@nitrostack/core';
import { TrustEngineTools } from './trustengine.tools.js';
import { TrustEngineResources } from './trustengine.resources.js';
import { TrustEnginePrompts } from './trustengine.prompts.js';
import { TrustEngineService } from '../../lib/trust-engine.service.js';
import { DatabaseService } from '../../lib/database.service.js';

@Module({
  name: 'trustengine',
  description: 'Trust scoring engine with explainability and fraud detection',
  controllers: [TrustEngineTools, TrustEngineResources, TrustEnginePrompts],
  providers: [TrustEngineService, DatabaseService],
})
export class TrustEngineModule {}
