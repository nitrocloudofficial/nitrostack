export declare class RuleChainService {
    createRuleChain(name: string, root?: boolean, debugMode?: boolean): Promise<any>;
    getRuleChain(ruleChainIdOrName?: string): Promise<any>;
    listRuleChains(pageSize?: number, page?: number): Promise<any>;
    deleteRuleChain(ruleChainIdOrName: string): Promise<void>;
    getRuleChainMetadata(ruleChainIdOrName?: string): Promise<any>;
    saveRuleChainMetadata(metadata: any): Promise<any>;
    getRuleNodeCatalog(category?: string): Promise<{
        category: string;
        components: any[];
        availableCategories?: undefined;
        catalog?: undefined;
    } | {
        availableCategories: string[];
        catalog: Record<string, any[]>;
        category?: undefined;
        components?: undefined;
    }>;
    searchComponents(query: string, type?: string): Promise<{
        name: any;
        clazz: any;
        type: any;
        configurationVersion: any;
        configurationDescriptor: any;
    }[]>;
    addNodeToRuleChain(ruleChainIdOrName: string | undefined, nodeName: string, componentClassOrName: string, configuration?: any, componentType?: string): Promise<{
        ruleChainId: string;
        nodeId: any;
        nodeName: any;
        componentClass: any;
        metadata: any;
    }>;
    connectNodesInRuleChain(ruleChainIdOrName: string | undefined, fromNodeName: string, toNodeName: string, relationType?: string): Promise<{
        ruleChainId: string;
        fromNode: string;
        toNode: string;
        relationType: string;
        metadata: any;
    }>;
    listNotificationTargets(pageSize?: number, page?: number): Promise<any>;
    listNotificationTemplates(pageSize?: number, page?: number): Promise<any>;
    resolveRuleChainId(ruleChainIdentifier?: string): Promise<string>;
}
//# sourceMappingURL=rule-chain.service.d.ts.map