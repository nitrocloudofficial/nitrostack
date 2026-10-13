import { ControllerDecorator as Controller, ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ServiceInfo {
    status: string;
    memory_mb: number;
    cpu_pct: number;
    error_rate_pct: number;
    uptime_hours: number;
    dependencies: string[];
    log: string;
}

interface InfraData {
    services: Record<string, ServiceInfo>;
    commits: Record<string, object>;
    overall_status: string;
}

/** Compute which services are impacted if a given service degrades */
function computeBlastRadius(
    serviceName: string,
    services: Record<string, ServiceInfo>
): { direct_dependents: string[]; transitive_dependents: string[]; total_blast_radius: number } {
    // Build reverse-dependency map: X → services that depend on X
    const dependedOnBy: Record<string, string[]> = {};
    for (const [svc, info] of Object.entries(services)) {
        for (const dep of info.dependencies) {
            if (!dependedOnBy[dep]) dependedOnBy[dep] = [];
            dependedOnBy[dep].push(svc);
        }
    }

    // BFS to find all transitively impacted services
    const direct = dependedOnBy[serviceName] ?? [];
    const visited = new Set<string>(direct);
    const queue = [...direct];
    while (queue.length > 0) {
        const current = queue.shift()!;
        const nextLevel = dependedOnBy[current] ?? [];
        for (const next of nextLevel) {
            if (!visited.has(next)) {
                visited.add(next);
                queue.push(next);
            }
        }
    }

    const transitive = [...visited].filter(s => !direct.includes(s));

    return {
        direct_dependents: direct,
        transitive_dependents: transitive,
        total_blast_radius: visited.size,
    };
}

@Controller()
export class InfrastructureResources {

    @Resource({
        uri: 'infrastructure://current-state',
        name: 'Live Infrastructure State',
        description: 'Full production infrastructure state including per-service health, dependency topology, and blast radius analysis. Use this before deciding on any remediation.',
        mimeType: 'application/json',
    })
    async getInfrastructureState(_uri: string, ctx: ExecutionContext) {
        ctx.logger.info('Agent requested the Live Infrastructure State resource.');
        try {
            const dataPath = path.resolve(__dirname, '../../src/data/mock-infrastructure.json');
            let fileContent: string;
            try {
                fileContent = fs.readFileSync(dataPath, 'utf-8');
            } catch (fsError: any) {
                if (fsError.code === 'ENOENT') {
                    return JSON.stringify({ error: 'mock-infrastructure.json not found.' });
                }
                throw fsError;
            }

            const data: InfraData = JSON.parse(fileContent);

            // Annotate each service with its blast radius
            const enriched = Object.entries(data.services).map(([name, info]) => {
                const blastRadius = computeBlastRadius(name, data.services);
                const healthScore = Math.max(0, 100
                    - (info.error_rate_pct * 2)
                    - (Math.max(0, info.cpu_pct - 70) * 0.5)
                    - (Math.max(0, info.memory_mb - 2000) / 100));

                return {
                    name,
                    status: info.status,
                    health_score: Math.round(healthScore),
                    metrics: {
                        memory_mb: info.memory_mb,
                        cpu_pct: info.cpu_pct,
                        error_rate_pct: info.error_rate_pct,
                        uptime_hours: info.uptime_hours,
                    },
                    dependencies: info.dependencies,
                    blast_radius: blastRadius,
                    recent_log_snippet: info.log.split('\n').slice(0, 3).join('\n'),
                };
            });

            // Identify the most critical service by impact score (error_rate × blast_radius)
            const mostCritical = enriched.reduce((prev, cur) => {
                const prevImpact = (data.services[prev.name].error_rate_pct) * (prev.blast_radius.total_blast_radius + 1);
                const curImpact = (data.services[cur.name].error_rate_pct) * (cur.blast_radius.total_blast_radius + 1);
                return curImpact > prevImpact ? cur : prev;
            });

            return JSON.stringify({
                overall_status: data.overall_status,
                service_count: enriched.length,
                degraded_services: enriched.filter(s => s.status !== 'healthy').map(s => s.name),
                highest_impact_service: {
                    name: mostCritical.name,
                    reason: `Error rate ${data.services[mostCritical.name].error_rate_pct}% × blast radius ${mostCritical.blast_radius.total_blast_radius} services`,
                },
                services: enriched,
                available_commits: Object.keys(data.commits),
            }, null, 2);

        } catch (error: any) {
            ctx.logger.error(`Error reading infrastructure resource: ${error.message}`);
            return JSON.stringify({ error: `Internal error: ${error.message}` });
        }
    }
}
