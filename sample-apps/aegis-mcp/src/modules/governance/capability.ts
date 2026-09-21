export type Capability =
    | 'READ_PRIVATE_DATA'
    | 'READ_PUBLIC_DATA'
    | 'WRITE_DATA'
    | 'WRITE_PUBLIC'
    | 'SEND_EXTERNAL'
    | 'DELETE_DATA'
    | 'EXECUTE';

export const TOOL_REGISTRY: Record<string, Capability[]> = {
    gmail: ['SEND_EXTERNAL', 'READ_PRIVATE_DATA'],
    dropbox: ['READ_PRIVATE_DATA', 'WRITE_DATA', 'SEND_EXTERNAL'],
    postgres: ['READ_PRIVATE_DATA', 'WRITE_DATA', 'DELETE_DATA'],
    slack: ['WRITE_PUBLIC', 'SEND_EXTERNAL'],
    filesystem: ['READ_PRIVATE_DATA', 'WRITE_DATA', 'EXECUTE'],
    calendar: ['READ_PRIVATE_DATA', 'WRITE_DATA'],
};

// In-memory per-agent store of connected tool IDs. No database — see CLAUDE.md §8.
const agentTools = new Map<string, Set<string>>();

export function getAgentTools(agentId: string): string[] {
    return Array.from(agentTools.get(agentId) ?? []);
}

export function connectTool(agentId: string, toolId: string): string[] {
    if (!(toolId in TOOL_REGISTRY)) {
        throw new Error(`Unknown tool: ${toolId}. Known tools: ${Object.keys(TOOL_REGISTRY).join(', ')}`);
    }
    const tools = agentTools.get(agentId) ?? new Set<string>();
    tools.add(toolId);
    agentTools.set(agentId, tools);
    return getAgentTools(agentId);
}

export function disconnectTool(agentId: string, toolId: string): string[] {
    agentTools.get(agentId)?.delete(toolId);
    return getAgentTools(agentId);
}

/** The agent's union of capabilities across all connected tools. */
export function getEffectiveCapabilities(agentId: string): Capability[] {
    const caps = new Set<Capability>();
    for (const toolId of getAgentTools(agentId)) {
        for (const cap of TOOL_REGISTRY[toolId] ?? []) {
            caps.add(cap);
        }
    }
    return Array.from(caps);
}

/** For each capability the agent currently has, which connected tools supply it. */
export function getCapabilitySources(agentId: string): Map<Capability, string[]> {
    const sources = new Map<Capability, string[]>();
    for (const toolId of getAgentTools(agentId)) {
        for (const cap of TOOL_REGISTRY[toolId] ?? []) {
            const list = sources.get(cap) ?? [];
            list.push(toolId);
            sources.set(cap, list);
        }
    }
    return sources;
}
