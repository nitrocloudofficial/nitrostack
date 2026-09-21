import { ToolDecorator as Tool, Widget, ExecutionContext, Injectable } from '@nitrostack/core';
import { IdeaService } from '../services/idea.service.js';
import { UnderstandIdeaInputSchema } from '../types/idea.types.js';

function ideaSummaryWidget(route: string) {
    return {
        route,
        prefersBorder: true,
    };
}

@Injectable({ deps: [IdeaService] })
export class UnderstandIdeaTools {
    constructor(private readonly ideaService: IdeaService) {}

    @Tool({
        name: 'understand_idea',
        description: 'Analyze a raw product or startup idea to identify industry category, core problem, target segment, value proposition, and competitor search keywords.',
        inputSchema: UnderstandIdeaInputSchema,
    })
    @Widget(ideaSummaryWidget('idea-summary'))
    async understandIdea(args: any, ctx: ExecutionContext) {
        const startTime = Date.now();
        ctx.logger.info('[Tool: understand_idea] Execution Started', { input: JSON.stringify(args) });
        
        try {
            const parseResult = UnderstandIdeaInputSchema.safeParse(args);
            const input = parseResult.success ? parseResult.data : { idea: typeof args === 'string' ? args : (args?.idea || 'New Idea') };

            const result = await this.ideaService.understand(input);
            const duration = Date.now() - startTime;
            
            ctx.logger.info('[Tool: understand_idea] Execution Completed', { 
                category: result.category,
                durationMs: duration 
            });
            
            return result;
        } catch (error: any) {
            const duration = Date.now() - startTime;
            const errorMsg = error instanceof Error ? error.message : String(error);
            ctx.logger.error('[Tool: understand_idea] Execution Failed', { error: errorMsg, durationMs: duration });

            return {
                category: args?.industry || 'Technology SaaS',
                coreProblem: args?.idea || 'Core problem analysis',
                targetAudience: args?.targetAudience || 'Target Users',
                valueProposition: `Solution for ${args?.idea || 'this domain'}.`,
                keywords: ['AI platform', 'SaaS platform', 'automation tool'],
                status: 'error',
                error: errorMsg
            };
        }
    }
}
