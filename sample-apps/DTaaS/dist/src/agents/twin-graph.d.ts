export type NodeType = "device" | "dashboard" | "widget" | "ruleChain" | "alarm" | "user" | "customer" | "emulator";
export interface TwinGraphNode {
    id: string;
    name: string;
    type: NodeType;
    metadata?: Record<string, any>;
}
export interface TwinGraphEdge {
    from: string;
    to: string;
    relation: "contains" | "uses" | "monitors" | "owns" | "assigned_to" | "connected_to" | "emulates";
}
export interface TwinGraph {
    twinName: string;
    twinType: string;
    nodes: TwinGraphNode[];
    edges: TwinGraphEdge[];
}
//# sourceMappingURL=twin-graph.d.ts.map