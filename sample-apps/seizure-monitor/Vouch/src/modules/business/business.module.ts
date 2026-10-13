import { Module } from '@nitrostack/core';
import { BusinessTools } from './business.tools.js';
import { BusinessResources } from './business.resources.js';
import { BusinessPrompts } from './business.prompts.js';
import { DatabaseService } from '../../lib/database.service.js';
import { TrustEngineService } from '../../lib/trust-engine.service.js';
import { AIAnalysisService } from '../../lib/ai-analysis.service.js';

@Module({
  name: 'business',
  description: 'Business registration, dashboard, and management',
  controllers: [BusinessTools, BusinessResources, BusinessPrompts],
  providers: [DatabaseService, TrustEngineService, AIAnalysisService],
})
export class BusinessModule {}
