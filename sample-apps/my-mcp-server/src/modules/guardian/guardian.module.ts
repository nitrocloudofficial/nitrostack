import { Module } from '@nitrostack/core';
import { PortfolioTools } from './portfolio.tools.js';
import { MarketTools } from './market.tools.js';
import { BehaviorTools } from './behavior.tools.js';
import { GuardianResources } from './guardian.resources.js';
import { GuardianPrompts } from './guardian.prompts.js';

/**
 * BidWiserAI.
 *
 * Layer A (relevance) lives in MarketTools, Layer B (behavioural intervention) in BehaviorTools.
 * PortfolioTools supplies the context both layers reason against.
 */
@Module({
  name: 'guardian',
  description: 'Behavioural guard and contextual explainer for a retail investor portfolio',
  controllers: [PortfolioTools, MarketTools, BehaviorTools, GuardianResources, GuardianPrompts]
})
export class GuardianModule {}
