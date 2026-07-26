import { OnModuleInit } from "@nitrostack/core";
import { DeviceDataService } from "../modules/sync/device-data.service.js";
import { TelemetrySchema } from "./types.js";
export declare class TelemetrySchemaService implements OnModuleInit {
    private readonly dataService;
    constructor(dataService?: DeviceDataService);
    onModuleInit(): Promise<void>;
    private seedDefaultSchemas;
    saveSchema(schema: TelemetrySchema): Promise<void>;
    getSchema(deviceType: string): Promise<TelemetrySchema | null>;
    listSchemas(): Promise<TelemetrySchema[]>;
}
export declare const telemetrySchemaService: TelemetrySchemaService;
//# sourceMappingURL=telemetry-schema.service.d.ts.map