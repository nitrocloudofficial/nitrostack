import { ToolDecorator as Tool, ExecutionContext, z, UseGuards, Injectable } from '@nitrostack/core';
import { OAuthGuard } from '../../guards/oauth.guard.js';
import { RecommendationService } from './recommendation.service.js';
import { VisaCaseService } from '../case/case.service.js';

/** Hackathon-only random broker-selection tool. */
@Injectable({ deps: [RecommendationService, VisaCaseService] })
export class RecommendationTools {
    constructor(
        private recommendationService: RecommendationService,
        private visaCaseService: VisaCaseService
    ) { }

    @Tool({
        name: 'recommend_best_brokers',
        description: 'Hackathon demo: selects one active broker at random. Available brokers are filtered only by the case destination country when a match exists; otherwise one is selected from all available brokers. Returns the selected broker, confidence 1.0, and up to three randomly ordered brokers. Advisory only: this does not assign a broker.',
        inputSchema: z.object({
            caseId: z.string().describe('The case ID to recommend brokers for.')
        }),
        examples: {
            request: {
                caseId: '3fa85f64-5717-4562-b3fc-2c963f66afa6'
            },
            response: {
                caseId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
                recommendationId: 'b7c2e1d0-4f8a-4c11-9d33-5a1e2f7b9c04',
                candidateCount: 2,
                recommendedBroker: 'broker_berlin_001',
                confidence: 1.0,
                reason: 'Demo mode random broker selection.',
                topThree: [
                    {
                        brokerId: 'broker_berlin_001',
                        rank: 1,
                        reason: 'Demo mode random broker selection.'
                    },
                    {
                        brokerId: 'broker_berlin_002',
                        rank: 2,
                        reason: 'Demo mode random broker selection.'
                    }
                ]
            }
        }
    })
    @UseGuards(OAuthGuard)
    async recommendBestBrokers(input: any, ctx: ExecutionContext) {
        ctx.logger.info('Selecting demo broker for case', {
            user: ctx.auth?.subject,
            caseId: input.caseId
        });

        const visaCase = await this.visaCaseService.getCase(input.caseId);
        const recommendation = await this.recommendationService.recommendDemoBroker(visaCase);

        if (!recommendation.ranking) {
            ctx.logger.info('No available demo brokers', {
                user: ctx.auth?.subject,
                caseId: visaCase.caseId
            });

            return {
                caseId: visaCase.caseId,
                candidateCount: 0,
                recommendedBroker: null,
                confidence: 0,
                reason: 'No available brokers for demo mode random selection.',
                topThree: []
            };
        }

        ctx.logger.info('Demo broker selected', {
            user: ctx.auth?.subject,
            caseId: visaCase.caseId,
            recommendationId: recommendation.recommendationId,
            recommendedBroker: recommendation.ranking.recommendedBroker
        });

        return {
            caseId: visaCase.caseId,
            recommendationId: recommendation.recommendationId,
            candidateCount: recommendation.candidateCount,
            recommendedBroker: recommendation.ranking.recommendedBroker,
            confidence: recommendation.ranking.confidence,
            reason: recommendation.ranking.reason,
            topThree: recommendation.ranking.topThree
        };
    }
}
