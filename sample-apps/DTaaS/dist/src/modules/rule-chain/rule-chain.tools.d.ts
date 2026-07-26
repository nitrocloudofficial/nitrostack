import { ExecutionContext } from "@nitrostack/core";
export declare class RuleChainTools {
    createRuleChain(input: {
        name: string;
        debugMode?: boolean;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        message: string;
        ruleChainId: any;
        ruleChain: any;
    } | {
        success: boolean;
        message: any;
        ruleChainId?: undefined;
        ruleChain?: undefined;
    }>;
    deleteRuleChain(input: {
        ruleChain?: string;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        message: any;
    }>;
    getRuleNodeCatalog(input: {
        category?: string;
    }, ctx: ExecutionContext): Promise<{
        category: string;
        components: any[];
        availableCategories?: undefined;
        catalog?: undefined;
        success: boolean;
        message?: undefined;
    } | {
        availableCategories: string[];
        catalog: Record<string, any[]>;
        category?: undefined;
        components?: undefined;
        success: boolean;
        message?: undefined;
    } | {
        success: boolean;
        message: any;
    }>;
    searchComponents(input: {
        query: string;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        count: number;
        components: {
            name: any;
            clazz: any;
            type: any;
            configurationVersion: any;
            configurationDescriptor: any;
        }[];
        message?: undefined;
    } | {
        success: boolean;
        message: any;
        count?: undefined;
        components?: undefined;
    }>;
    getRuleChainMetadata(input: {
        ruleChain?: string;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        ruleChainId: any;
        firstNodeIndex: any;
        nodes: any;
        connections: any;
        rawMetadata: any;
        message?: undefined;
    } | {
        success: boolean;
        message: any;
        ruleChainId?: undefined;
        firstNodeIndex?: undefined;
        nodes?: undefined;
        connections?: undefined;
        rawMetadata?: undefined;
    }>;
    addNodeToRuleChain(input: {
        ruleChain?: string;
        nodeName: string;
        component: string;
        componentType?: string;
        configuration?: any;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        message: string;
        ruleChainId: string;
        nodeId: any;
        componentClass: any;
    } | {
        success: boolean;
        message: any;
        ruleChainId?: undefined;
        nodeId?: undefined;
        componentClass?: undefined;
    }>;
    connectRuleNodes(input: {
        ruleChain?: string;
        fromNode: string;
        toNode: string;
        relation?: string;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        message: string;
        ruleChainId: string;
        relationType: string;
    } | {
        success: boolean;
        message: any;
        ruleChainId?: undefined;
        relationType?: undefined;
    }>;
    listNotificationTargets(input: {
        pageSize?: number;
        page?: number;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        targets: any;
        rawResult: any;
        message?: undefined;
    } | {
        success: boolean;
        message: any;
        targets?: undefined;
        rawResult?: undefined;
    }>;
    listNotificationTemplates(input: {
        pageSize?: number;
        page?: number;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        templates: any;
        rawResult: any;
        message?: undefined;
    } | {
        success: boolean;
        message: any;
        templates?: undefined;
        rawResult?: undefined;
    }>;
}
//# sourceMappingURL=rule-chain.tools.d.ts.map