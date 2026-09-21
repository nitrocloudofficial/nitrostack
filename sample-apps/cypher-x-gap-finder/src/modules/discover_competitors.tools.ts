import { ToolDecorator as Tool, Widget, ExecutionContext, Injectable } from '@nitrostack/core';
import { CompetitorDiscoveryService } from '../services/competitorDiscovery.service.js';
import { DiscoverCompetitorsInputSchema } from '../types/competitor.js';

function competitorListWidget(route: string) {
    return {
        route,
        prefersBorder: true,
    };
}

@Injectable({ deps: [CompetitorDiscoveryService] })
export class DiscoverCompetitorsTools {
    constructor(private readonly discoveryService: CompetitorDiscoveryService) {}

    @Tool({
        name: 'discover_competitors',
        description: 'Discover relevant competitors for a startup or product idea based on its structured properties and keywords using search engine APIs.',
        inputSchema: DiscoverCompetitorsInputSchema,
    })
    @Widget(competitorListWidget('competitor-list'))
    async discoverCompetitors(args: any, ctx: ExecutionContext) {
        const startTime = Date.now();
        ctx.logger.info('[Tool: discover_competitors] Execution Started', { input: JSON.stringify(args) });

        try {
            const parseResult = DiscoverCompetitorsInputSchema.safeParse(args);
            const parsedInput = parseResult.success ? parseResult.data : (args || {});

            const result = await this.discoveryService.discover(parsedInput);
            const duration = Date.now() - startTime;

            ctx.logger.info('[Tool: discover_competitors] Execution Completed', { 
                competitorsCount: result.competitors?.length || 0,
                durationMs: duration 
            });

            return result;
        } catch (error: any) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            ctx.logger.error('[Tool: discover_competitors] Execution Failed', { error: errorMessage, durationMs: duration });

            return {
                competitors: [],
                status: 'error',
                message: errorMessage,
                error: errorMessage
            };
        }
    }
}
