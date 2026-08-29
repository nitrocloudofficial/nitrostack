import { ToolDecorator as Tool, Widget, ExecutionContext, Injectable } from '@nitrostack/core';
import { CompetitorProfileService } from '../services/competitorProfile.service.js';
import { ExtractCompetitorProfilesInputSchema } from '../types/profile.types.js';

function profileWidget(route: string) {
    return {
        route,
        prefersBorder: true,
    };
}

@Injectable({ deps: [CompetitorProfileService] })
export class ExtractCompetitorProfilesTools {
    constructor(private readonly profileService: CompetitorProfileService) {}

    @Tool({
        name: 'extract_competitor_profiles',
        description: 'Extract comprehensive competitor profiles including pricing, features, business model, funding, strengths, weaknesses, and USP.',
        inputSchema: ExtractCompetitorProfilesInputSchema,
    })
    @Widget(profileWidget('competitor-profile'))
    async extractProfiles(args: any, ctx: ExecutionContext) {
        const startTime = Date.now();
        ctx.logger.info('[Tool: extract_competitor_profiles] Execution Started', { input: JSON.stringify(args) });

        try {
            const parseResult = ExtractCompetitorProfilesInputSchema.safeParse(args);
            const parsedInput = parseResult.success ? parseResult.data : (args || {});

            const result = await this.profileService.extractProfiles(parsedInput);
            const duration = Date.now() - startTime;

            ctx.logger.info('[Tool: extract_competitor_profiles] Execution Completed', { 
                profilesCount: result.profiles?.length || 0,
                durationMs: duration 
            });

            return result;
        } catch (error: any) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);
            ctx.logger.error('[Tool: extract_competitor_profiles] Execution Failed', { error: errorMessage, durationMs: duration });

            return {
                profiles: [],
                status: 'error',
                message: errorMessage
            };
        }
    }
}
