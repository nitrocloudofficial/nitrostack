export type NodeType = "device" | "dashboard" | "ruleChain" | "alarm" | "user";
export interface TwinGraphNode {
    id: string;
    name: string;
    type: NodeType;
    metadata?: Record<string, any>;
}
export interface TwinGraphEdge {
    from: string;
    to: string;
    relation: "contains" | "uses" | "monitors" | "owns" | "connected_to";
}
export interface TwinGraph {
    twinName: string;
    twinType: string;
    nodes: TwinGraphNode[];
    edges: TwinGraphEdge[];
}
//# sourceMappingURL=twin-graph.d.ts.map