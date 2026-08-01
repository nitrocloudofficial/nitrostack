import { ToolDecorator as Tool, Widget, ExecutionContext, UseGuards, z } from '@nitrostack/core';
import { OAuthGuard } from './oauth.guard.js';
import {
    connectTool,
    disconnectTool,
    getAgentTools,
    getEffectiveCapabilities,
    TOOL_REGISTRY,
    type Capability,
} from './capability.js';
import { detectAttackPaths, computeRiskScore } from './detector.js';

const ConnectToolSchema = z.object({
    agentId: z.string().describe('ID of the agent to connect the tool to'),
    toolId: z.string().describe(`Tool to connect. One of: ${Object.keys(TOOL_REGISTRY).join(', ')}`),
});

const AgentIdSchema = z.object({
    agentId: z.string().describe('ID of the agent to inspect'),
});

const ApplyPolicyFixSchema = z.object({
    agentId: z.string().describe('ID of the agent to fix'),
    ruleId: z.string().describe("ID of the detected policy rule to remediate (e.g. 'exfiltration')"),
});

const CAP_LABELS: Record<Capability, string> = {
    READ_PRIVATE_DATA: 'Read Private Data',
    READ_PUBLIC_DATA: 'Read Public Data',
    WRITE_DATA: 'Write Data',
    WRITE_PUBLIC: 'Write Public',
    SEND_EXTERNAL: 'Send External',
    DELETE_DATA: 'Delete Data',
    EXECUTE: 'Execute',
};

function toolLabel(toolId: string): string {
    return toolId.charAt(0).toUpperCase() + toolId.slice(1);
}

function buildCapabilityGraph(agentId: string) {
    const tools = getAgentTools(agentId);
    const effectiveCaps = getEffectiveCapabilities(agentId);
    const attackPaths = detectAttackPaths(agentId);
    const riskScore = computeRiskScore(attackPaths);

    const nodes = [
        { id: 'agent', type: 'agent' as const, label: agentId },
        ...tools.map((toolId) => ({ id: `tool:${toolId}`, type: 'tool' as const, label: toolLabel(toolId) })),
        ...effectiveCaps.map((cap) => ({ id: `cap:${cap}`, type: 'capability' as const, label: CAP_LABELS[cap] })),
    ];

    const edges: { id: string; source: string; target: string; danger: boolean }[] = [];
    let edgeIndex = 0;
    for (const toolId of tools) {
        for (const cap of TOOL_REGISTRY[toolId] ?? []) {
            const danger = attackPaths.some(
                (path) => (path.source === cap || path.sink === cap) && path.viaTools.includes(toolId)
            );
            edges.push({ id: `e${++edgeIndex}`, source: `tool:${toolId}`, target: `cap:${cap}`, danger });
        }
    }

    return { agentId, nodes, edges, attackPaths, riskScore };
}

export class GovernanceTools {
    @Tool({
        name: 'connect_tool',
        description:
            "Connect a third-party tool (gmail, dropbox, postgres, slack, filesystem, calendar) to an agent, " +
            "granting it that tool's capabilities. Returns the agent's updated effective capability set.",
        inputSchema: ConnectToolSchema,
        examples: {
            request: { agentId: 'support-agent', toolId: 'dropbox' },
            response: {
                agentId: 'support-agent',
                connectedTools: ['dropbox'],
                effectiveCapabilities: ['READ_PRIVATE_DATA', 'WRITE_DATA', 'SEND_EXTERNAL'],
            },
        },
    })
    @UseGuards(OAuthGuard)
    async connectTool(args: z.infer<typeof ConnectToolSchema>, ctx: ExecutionContext) {
        try {
            const connectedTools = connectTool(args.agentId, args.toolId);
            const effectiveCapabilities = getEffectiveCapabilities(args.agentId);
            ctx.logger.info('Connected tool to agent', {
                agentId: args.agentId,
                toolId: args.toolId,
                effectiveCapabilities,
            });
            return { agentId: args.agentId, connectedTools, effectiveCapabilities };
        } catch (error) {
            ctx.logger.info('Failed to connect tool', { error: (error as Error).message });
            return { error: (error as Error).message };
        }
    }

    @Tool({
        name: 'get_capability_graph',
        description:
            "Return the agent's capability graph: nodes (agent/tool/capability), edges " +
            "(danger=true when part of a detected attack path), detected attack paths, and an overall risk score.",
        inputSchema: AgentIdSchema,
        examples: {
            request: { agentId: 'support-agent' },
            response: {
                agentId: 'support-agent',
                nodes: [
                    { id: 'agent', type: 'agent', label: 'support-agent' },
                    { id: 'tool:dropbox', type: 'tool', label: 'Dropbox' },
                    { id: 'cap:READ_PRIVATE_DATA', type: 'capability', label: 'Read Private Data' },
                ],
                edges: [{ id: 'e1', source: 'tool:dropbox', target: 'cap:READ_PRIVATE_DATA', danger: true }],
                attackPaths: [
                    {
                        ruleId: 'exfiltration',
                        source: 'READ_PRIVATE_DATA',
                        sink: 'SEND_EXTERNAL',
                        viaTools: ['dropbox'],
                        severity: 'critical',
                        message: 'Agent can read private data AND send it externally — data exfiltration path.',
                    },
                ],
                riskScore: 1,
            },
        },
    })
    @Widget('capability-graph')
    async getCapabilityGraph(args: z.infer<typeof AgentIdSchema>, ctx: ExecutionContext) {
        try {
            const graph = buildCapabilityGraph(args.agentId);
            ctx.logger.info('Built capability graph', {
                agentId: args.agentId,
                riskScore: graph.riskScore,
                attackPathCount: graph.attackPaths.length,
            });
            return graph;
        } catch (error) {
            ctx.logger.info('Failed to build capability graph', { error: (error as Error).message });
            return { error: (error as Error).message };
        }
    }

    @Tool({
        name: 'detect_attack_paths',
        description:
            'Run the deterministic toxic-capability-combination detector for an agent and return any ' +
            'detected attack paths with severity and an overall risk score.',
        inputSchema: AgentIdSchema,
        examples: {
            request: { agentId: 'support-agent' },
            response: {
                agentId: 'support-agent',
                paths: [
                    {
                        ruleId: 'exfiltration',
                        severity: 'critical',
                        viaTools: ['dropbox', 'gmail'],
                        message: 'Agent can read private data AND send it externally — data exfiltration path.',
                    },
                ],
                riskScore: 1,
            },
        },
    })
    @Widget('attack-path-alert')
    async detectAttackPathsForAgent(args: z.infer<typeof AgentIdSchema>, ctx: ExecutionContext) {
        try {
            const attackPaths = detectAttackPaths(args.agentId);
            const riskScore = computeRiskScore(attackPaths);
            const paths = attackPaths.map(({ ruleId, severity, viaTools, message }) => ({
                ruleId,
                severity,
                viaTools,
                message,
            }));
            ctx.logger.info('Detected attack paths', { agentId: args.agentId, count: paths.length, riskScore });
            return { agentId: args.agentId, paths, riskScore };
        } catch (error) {
            ctx.logger.info('Failed to detect attack paths', { error: (error as Error).message });
            return { error: (error as Error).message };
        }
    }

    @Tool({
        name: 'apply_policy_fix',
        description:
            "Remediate a detected attack path by disconnecting the tool that supplies its riskier (sink) " +
            "capability from the agent, then return the refreshed capability graph.",
        inputSchema: ApplyPolicyFixSchema,
        examples: {
            request: { agentId: 'support-agent', ruleId: 'exfiltration' },
            response: {
                agentId: 'support-agent',
                nodes: [{ id: 'agent', type: 'agent', label: 'support-agent' }],
                edges: [],
                attackPaths: [],
                riskScore: 0,
            },
        },
    })
    async applyPolicyFix(args: z.infer<typeof ApplyPolicyFixSchema>, ctx: ExecutionContext) {
        try {
            const attackPaths = detectAttackPaths(args.agentId);
            const target = attackPaths.find((path) => path.ruleId === args.ruleId);
            if (!target) {
                return { error: `No active attack path found for rule '${args.ruleId}' on agent '${args.agentId}'` };
            }

            // Disconnect every currently-connected tool that supplies the riskier
            // (sink) capability. A single-tool removal isn't guaranteed to clear the
            // rule when more than one connected tool independently supplies the sink
            // (e.g. both gmail and dropbox grant SEND_EXTERNAL) — removing all of
            // them for this sink is what actually guarantees the rule stops firing.
            const removedTools = getAgentTools(args.agentId).filter((toolId) =>
                TOOL_REGISTRY[toolId]?.includes(target.sink as Capability)
            );
            for (const toolId of removedTools) {
                disconnectTool(args.agentId, toolId);
            }

            const graph = buildCapabilityGraph(args.agentId);
            ctx.logger.info('Applied policy fix', {
                agentId: args.agentId,
                ruleId: args.ruleId,
                removedTools,
            });
            return graph;
        } catch (error) {
            ctx.logger.info('Failed to apply policy fix', { error: (error as Error).message });
            return { error: (error as Error).message };
        }
    }
}
