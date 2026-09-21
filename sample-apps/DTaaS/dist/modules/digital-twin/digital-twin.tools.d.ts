import { ExecutionContext } from "@nitrostack/core";
export declare class DigitalTwinTools {
    createDigitalTwin(input: {
        prompt: string;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        specification: import("../../agents/planner/planner.schema.js").TwinSpecification;
        graph: import("../../agents/twin-graph.js").TwinGraph;
        message?: undefined;
    } | {
        success: boolean;
        message: any;
        specification?: undefined;
        graph?: undefined;
    }>;
}
//# sourceMappingURL=digital-twin.tools.d.ts.map