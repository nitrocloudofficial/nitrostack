import { OnModuleInit } from "@nitrostack/core";
import { DeviceDataService } from "../modules/sync/device-data.service.js";
import { VisualMapping } from "./types.js";
export declare class VisualMappingService implements OnModuleInit {
    private readonly dataService;
    constructor(dataService?: DeviceDataService);
    onModuleInit(): Promise<void>;
    saveMapping(mapping: VisualMapping, status?: string): Promise<void>;
    getMapping(deviceType: string): Promise<VisualMapping | null>;
    listMappings(): Promise<VisualMapping[]>;
}
export declare const visualMappingService: VisualMappingService;
//# sourceMappingURL=visual-mapping.service.d.ts.map