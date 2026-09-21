import { ExecutionContext } from "@nitrostack/core";
import { VisualMappingService } from "./visual-mapping.service.js";
import { TelemetrySchemaService } from "./telemetry-schema.service.js";
import { VisualMappingAgentService } from "./visual-mapping-agent.service.js";
import { DeviceDataService } from "../modules/sync/device-data.service.js";
export declare class VisualizationTools {
    private readonly mappingService;
    private readonly schemaService;
    private readonly agentService;
    private readonly dataService;
    constructor(mappingService?: VisualMappingService, schemaService?: TelemetrySchemaService, agentService?: VisualMappingAgentService, dataService?: DeviceDataService);
    generateVisualMapping(input: {
        deviceType: string;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        mapping: import("./types.js").VisualMapping;
        message?: undefined;
    } | {
        success: boolean;
        message: any;
        mapping?: undefined;
    }>;
    getDevice3DView(input: {
        deviceId: string;
        deviceType: string;
    }, ctx: ExecutionContext): Promise<{
        content: ({
            type: "resource";
            resource: {
                uri: string;
                mimeType: string;
                text: string;
            };
            text?: undefined;
        } | {
            type: "text";
            text: string;
            resource?: undefined;
        })[];
        success: boolean;
        html: string;
        message?: undefined;
    } | {
        success: boolean;
        message: any;
        content?: undefined;
        html?: undefined;
    }>;
    previewVisualMapping(input: {
        deviceType: string;
    }, ctx: ExecutionContext): Promise<{
        content: ({
            type: "resource";
            resource: {
                uri: string;
                mimeType: string;
                text: string;
            };
            text?: undefined;
        } | {
            type: "text";
            text: string;
            resource?: undefined;
        })[];
        success: boolean;
        html: string;
        message?: undefined;
    } | {
        success: boolean;
        message: any;
        content?: undefined;
        html?: undefined;
    }>;
}
//# sourceMappingURL=visualization.tools.d.ts.map