import { ExecutionContext } from '@nitrostack/core';
import { z } from 'zod';
import { MockCloudService } from '../../services/mock-cloud.service.js';
import { UtilizationService, PatternType } from './utilization.service.js';

export interface WasteItem {
    instanceId: string;
    name: string;
    pattern: PatternType;
    ownerTag: string;
    ownerStatus: string;
    monthlyCost: number;
    reason: string;
}

export interface DetectIdleWasteResult {
    candidates: WasteItem[];
    excluded: WasteItem[];
}

// Custom lightweight tool metadata decorator to support both NitroStack runtime and standalone unit tests

function Tool(_options: { name: string; description: string; inputSchema: z.ZodSchema }): any {
    return function (..._args: any[]): any { };
}

export class AnalysisTools {
    private readonly cloudService = new MockCloudService();
    private readonly utilizationService = new UtilizationService();

    @Tool({
        name: 'analyze_resource_utilization',
        description: "Evaluates an EC2 instance's 168-hour CPU metrics and classifies its workload pattern.",
        inputSchema: z.object({
            resourceId: z.string().describe('The EC2 instance ID to analyze'),
        }),
    })
    async analyze(input: { resourceId: string }, _ctx?: ExecutionContext) {
        const metrics = await this.cloudService.getMetrics(input.resourceId);
        if (!metrics) {
            return { error: `Resource '${input.resourceId}' was not found in cloud inventory.` };
        }
        return this.utilizationService.classify(metrics);
    }

    @Tool({
        name: 'detect_idle_waste',
        description: 'Scans all infrastructure assets to pinpoint confirmed zombie waste candidates.',
        inputSchema: z.object({}),
    })
    async detectIdleWaste(_input?: Record<string, unknown>, _ctx?: ExecutionContext): Promise<DetectIdleWasteResult> {
        const [instances, directory] = await Promise.all([
            this.cloudService.getComputeInstances(),
            this.cloudService.getDirectory(),
        ]);

        const candidates: WasteItem[] = [];
        const excluded: WasteItem[] = [];

        for (const instance of instances) {
            const metrics = await this.cloudService.getMetrics(instance.instanceId);
            if (!metrics) continue;

            const classification = this.utilizationService.classify(metrics);
            const owner = directory.find((d) => d.ownerTag === instance.ownerTag);
            const ownerStatus = owner?.status ?? 'unknown';
            const monthlyCost = Number((instance.costPerHour * 730).toFixed(2));

            const item: WasteItem = {
                instanceId: instance.instanceId,
                name: instance.name,
                pattern: classification.pattern,
                ownerTag: instance.ownerTag,
                ownerStatus,
                monthlyCost,
                reason: '',
            };

            if (classification.pattern === 'periodic_burst') {
                item.reason = `Excluded: Workload displays a recurring batch/ETL spike pattern (${classification.spikeHourCount} spike hours up to ${classification.peakCpu}% CPU). Spared from termination.`;
                excluded.push(item);
            } else if (ownerStatus === 'departed' || classification.pattern === 'flat_idle') {
                item.reason = ownerStatus === 'departed'
                    ? `Candidate for Termination: Resource owner (${owner?.fullName ?? instance.ownerTag}) is marked as 'departed' in directory.`
                    : `Candidate for Termination: Resource is flat idle with average CPU utilization at ${classification.avgCpu}%.`;
                candidates.push(item);
            } else {
                item.reason = `Excluded: Resource actively utilized under pattern '${classification.pattern}' with owner status '${ownerStatus}'.`;
                excluded.push(item);
            }
        }

        return { candidates, excluded };
    }
}