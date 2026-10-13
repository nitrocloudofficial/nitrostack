import {
    ToolDecorator as Tool,
    Widget,
    ExecutionContext,
    Injectable,
    z,
} from '@nitrostack/core';

import { RakshaNetService } from './rakshanet.service.js';

function rakshaWidget(route: string) {
    return {
        route,
        prefersBorder: true,
    };
}

const ThreatSchema = z.object({
    night: z.boolean(),
    poorLighting: z.boolean(),
    routeDeviation: z.boolean(),
    audioThreat: z.number().min(0).max(100),
    latitude: z.number(),
    longitude: z.number(),
    guardianPhone: z.string(),
});

@Injectable({ deps: [RakshaNetService] })
export class RakshaNetTools {
    constructor(
        private readonly rakshaNetService: RakshaNetService,
    ) {}

    @Tool({
        name: 'assess_threat',
        description: 'Assess the user safety risk based on environmental conditions.',
        inputSchema: ThreatSchema,
    })
    @Widget(rakshaWidget('rakshanet'))
    async assessThreat(
        args: z.infer<typeof ThreatSchema>,
        ctx: ExecutionContext,
    ) {
        ctx.logger.info('Assessing threat', args);

        return this.rakshaNetService.assessThreat(args);
    }
}