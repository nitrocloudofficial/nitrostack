import { ExecutionContext } from "@nitrostack/core";
import { ModelStoreService } from "./model-store.service.js";
import { ModelBuilderAgentService } from "./model-builder-agent.service.js";
export declare class SimulationTools {
    private readonly modelStore;
    private readonly modelBuilderAgent;
    constructor(modelStore?: ModelStoreService, modelBuilderAgent?: ModelBuilderAgentService);
    generateSimulationModel(input: {
        requirement: string;
        domain?: string;
    }, ctx: ExecutionContext): Promise<{
        id: string;
        domain: string;
        mode: "equations" | "rates" | "rules";
        stateVars: string[];
        params: Record<string, number>;
        equations?: Record<string, string>;
        rates?: Record<string, string>;
        rules?: {
            condition: string;
            effect: string;
        }[];
        knownFormulaReference: string | null;
        assumptions: string[];
        confidence: "high" | "medium" | "low";
        requiresExpertReview: boolean;
        status: "draft" | "reviewed" | "trusted";
        reviewedBy?: string;
        success: boolean;
        modelId: string;
        message?: undefined;
    } | {
        success: boolean;
        message: any;
    }>;
    runSimulationTool(input: {
        modelId: string;
        steps: number;
        dt: number;
        paramOverrides?: Record<string, number>;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        modelId: string;
        modelStatus: "draft" | "reviewed" | "trusted";
        paramsUsed: {
            [x: string]: number;
        };
        resultHistory: {
            [key: string]: number;
            t: number;
        }[];
        message?: undefined;
    } | {
        success: boolean;
        message: any;
        modelId?: undefined;
        modelStatus?: undefined;
        paramsUsed?: undefined;
        resultHistory?: undefined;
    }>;
    approveSimulationModel(input: {
        modelId: string;
        reviewedBy: string;
        equationOverrides?: Record<string, string>;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        message: any;
    }>;
}
//# sourceMappingURL=simulation.tools.d.ts.map