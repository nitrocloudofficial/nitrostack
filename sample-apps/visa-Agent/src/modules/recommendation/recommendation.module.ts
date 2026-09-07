import { Module } from '@nitrostack/core';
import { RecommendationTools } from './recommendation.tools.js';
import { RecommendationService } from './recommendation.service.js';
import { MongoService } from '../../services/mongodb.service.js';
import { CaseModule } from '../case/case.module.js';

/**
 * Hackathon-only random broker selection from active broker profiles.
 * No LLM, semantic search, ranking, or recommendation persistence is used.
 */
@Module({
    name: 'recommendation',
    description: 'Broker Recommendation Module: random selection from active brokers, preferring destination-country matches. No LLM, semantic search, ranking, or recommendation persistence.',
    imports: [CaseModule],
    controllers: [RecommendationTools],
    providers: [MongoService, RecommendationService]
})
export class BrokerRecommendationModule { }
