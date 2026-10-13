import { ToolDecorator as Tool, ExecutionContext, z, UseGuards, Injectable } from '@nitrostack/core';
import { OAuthGuard } from '../../guards/oauth.guard.js';
import { HousingService } from './housing.service.js';
import { VisaCaseService } from '../case/case.service.js';

/**
 * HousingTools
 *
 * Fifth vertical slice: captures housing preferences and returns a
 * deterministic broker shortlist for a case.
 *
 * Cross-module access uses the same NitroStack DI pattern as the Onboarding,
 * Requirement, and Document modules: VisaCaseService is injected from the
 * Case Module and called directly — never over HTTP, never tool-to-tool.
 *
 * TODO(housing): required scopes per docs/ARCHITECTURE.md §15 would be
 * `case:read` for both tools, plus `broker:assign` for any future assignment
 * tool. OAuthGuard is applied for consistency with the rest of the codebase;
 * no fine-grained scope or tenant check is enforced yet.
 * TODO(housing): no audit logging or event emission yet.
 */
@Injectable({ deps: [HousingService, VisaCaseService] })
export class HousingTools {
    constructor(
        private housingService: HousingService,
        private visaCaseService: VisaCaseService
    ) { }

    @Tool({
        name: 'collect_housing_preferences',
        description: 'Stores an applicant\'s housing preferences for an existing visa case in MongoDB. Verifies the case exists first. Re-running for the same case updates the stored preferences rather than creating a duplicate.',
        inputSchema: z.object({
            caseId: z.string().describe('The case ID returned by case_start or onboarding_extract'),
            preferredAreas: z.array(z.string()).describe('Preferred neighbourhoods or districts, e.g. ["Mitte", "Kreuzberg"]'),
            apartmentType: z.string().describe('Apartment type, e.g. "studio", "1bhk", "2bhk"'),
            monthlyBudget: z.number().positive().describe('Maximum monthly rent the applicant can pay'),
            currency: z.string().describe('ISO currency code for the budget, e.g. "EUR"'),
            moveInBy: z.string().describe('Target move-in date, ISO 8601, e.g. "2026-09-01"'),
            familySize: z.number().int().positive().describe('Number of people who will live in the property'),
            priorities: z.array(z.string()).describe('What matters most, e.g. ["commute", "school_access", "furnished"]'),
            hardExclusions: z.array(z.string()).describe('Non-negotiable exclusions, e.g. ["No basement apartments"]'),
            description: z.string().describe('Free-form notes about the housing need')
        }),
        examples: {
            request: {
                caseId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
                preferredAreas: ['Mitte', 'Kreuzberg'],
                apartmentType: '2bhk',
                monthlyBudget: 2200,
                currency: 'EUR',
                moveInBy: '2026-09-01',
                familySize: 2,
                priorities: ['commute', 'school_access'],
                hardExclusions: ['No basement apartments'],
                description: 'Family of two relocating for a Masters programme.'
            },
            response: {
                success: true,
                caseId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
                preferenceId: '9c1f0e2a-77b4-4c3d-9a51-1f7e2b6d8c40',
                updatedAt: '2026-07-26T12:00:00.000Z'
            }
        }
    })
    @UseGuards(OAuthGuard)
    async collectHousingPreferences(input: any, ctx: ExecutionContext) {
        ctx.logger.info('Collecting housing preferences', {
            user: ctx.auth?.subject,
            caseId: input.caseId
        });

        // Verify the case exists before writing anything, so preferences can
        // never be stored against an unknown case.
        const visaCase = await this.visaCaseService.getCase(input.caseId);

        const record = await this.housingService.savePreferences({
            caseId: visaCase.caseId,
            preferredAreas: input.preferredAreas,
            apartmentType: input.apartmentType,
            monthlyBudget: input.monthlyBudget,
            currency: input.currency,
            moveInBy: input.moveInBy,
            familySize: input.familySize,
            priorities: input.priorities,
            hardExclusions: input.hardExclusions,
            description: input.description
        });

        ctx.logger.info('Housing preferences stored', {
            user: ctx.auth?.subject,
            caseId: visaCase.caseId,
            preferenceId: record.preferenceId
        });

        return {
            success: true,
            caseId: record.caseId,
            preferenceId: record.preferenceId,
            updatedAt: record.updatedAt
        };
    }

    @Tool({
        name: 'recommend_brokers',
        description: 'Returns up to 10 active housing brokers that deterministically match a case: same destination country, overlapping preferred area, budget within range, and matching apartment type. No LLM is used — the result is an unranked candidate set plus a compact preference summary, intended as input to a separate ranking stage. This is advisory only and does not assign a broker.',
        inputSchema: z.object({
            caseId: z.string().describe('The case ID to recommend brokers for')
        }),
        examples: {
            request: {
                caseId: '3fa85f64-5717-4562-b3fc-2c963f66afa6'
            },
            response: {
                caseId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
                recommendationId: 'b7c2e1d0-4f8a-4c11-9d33-5a1e2f7b9c04',
                candidateCount: 1,
                preferences: {
                    caseId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
                    destinationCountry: 'Germany',
                    preferredAreas: ['Mitte', 'Kreuzberg'],
                    apartmentType: '2bhk',
                    monthlyBudget: 2200,
                    currency: 'EUR',
                    moveInBy: '2026-09-01',
                    familySize: 2,
                    priorities: ['commute'],
                    hardExclusions: ['No basement apartments'],
                    description: 'Family of two relocating for a Masters programme.'
                },
                brokers: [
                    {
                        brokerId: 'broker_berlin_001',
                        name: 'Aster Relocation Berlin',
                        description: 'Relocation specialists for central Berlin.',
                        rating: 4.8,
                        areasCovered: ['Mitte', 'Kreuzberg'],
                        languages: ['German', 'English', 'Hindi'],
                        previousCasesHandled: 142
                    }
                ]
            }
        }
    })
    @UseGuards(OAuthGuard)
    async recommendBrokers(input: any, ctx: ExecutionContext) {
        ctx.logger.info('Recommending brokers for case', {
            user: ctx.auth?.subject,
            caseId: input.caseId
        });

        // 1. Read the case via VisaCaseService.
        const visaCase = await this.visaCaseService.getCase(input.caseId);

        // 2. Read the stored housing preferences.
        const preferences = await this.housingService.getPreferences(visaCase.caseId);

        // 3. Deterministically filter active brokers. No model involved.
        const brokers = await this.housingService.findEligibleBrokers(visaCase, preferences);
        const summary = this.housingService.buildPreferenceSummary(visaCase, preferences);

        // 4. Persist the advisory shortlist for later review.
        const recommendationId = await this.housingService.saveRecommendation({
            caseId: visaCase.caseId,
            preferences: summary,
            candidates: brokers
        });

        ctx.logger.info('Broker candidates resolved', {
            user: ctx.auth?.subject,
            caseId: visaCase.caseId,
            recommendationId,
            candidateCount: brokers.length
        });

        return {
            caseId: visaCase.caseId,
            recommendationId,
            candidateCount: brokers.length,
            preferences: summary,
            brokers
        };
    }
}
