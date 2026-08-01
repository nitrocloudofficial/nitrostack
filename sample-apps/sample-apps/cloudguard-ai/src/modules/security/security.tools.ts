import { ExecutionContext } from '@nitrostack/core';
import { z } from 'zod';
import { MockCloudService } from '../../services/mock-cloud.service.js';

export interface EnrichedFinding {
    findingId: string;
    resourceId: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    description: string;
    ownerTag: string;
    ownerName: string;
    remediationAction: string;
}

function Tool(_options: { name: string; description: string; inputSchema: z.ZodSchema }): any {
    return function (..._args: any[]): any { };
}

export class SecurityTools {
    private readonly cloudService = new MockCloudService();

    @Tool({
        name: 'scan_security_posture',
        description: 'Returns cloud security findings ranked by severity level',
        inputSchema: z.object({
            minSeverity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
        }),
    })
    async scan(
        input: { minSeverity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' },
        _ctx?: ExecutionContext
    ) {
        const [rawFindings, computeInstances, directory] = await Promise.all([
            this.cloudService.getSecurityFindings(),
            this.cloudService.getComputeInstances(),
            this.cloudService.getDirectory(),
        ]);

        const severityWeight: Record<string, number> = {
            CRITICAL: 4,
            HIGH: 3,
            MEDIUM: 2,
            LOW: 1,
        };

        const minWeight = input?.minSeverity ? severityWeight[input.minSeverity] : 1;

        const findings: EnrichedFinding[] = rawFindings
            .filter((f) => (severityWeight[f.severity] ?? 0) >= minWeight)
            .map((f: any) => {
                const findingId = f.findingId ?? f.id ?? 'unknown-finding';
                const instance = computeInstances.find((i) => i.instanceId === f.resourceId);
                const ownerTag = instance?.ownerTag ?? f.ownerTag ?? 'unknown';
                const owner = directory.find((d) => d.ownerTag === ownerTag);

                return {
                    findingId,
                    resourceId: f.resourceId,
                    severity: f.severity as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
                    title: f.title,
                    description: f.description,
                    ownerTag,
                    ownerName: owner?.fullName ?? 'Unassigned / Unknown',
                    remediationAction: f.remediationAction ?? 'Review and restrict public access policy.',
                };
            })
            .sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity]);

        return findings;
    }
}