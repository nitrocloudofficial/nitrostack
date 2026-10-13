import { Module } from "@nitrostack/core";
import { DeviceDataService, deviceDataService } from "./device-data.service.js";
import { ThingsBoardClientService, thingsboardClientService } from "./thingsboard-client.service.js";
import { SyncRegistryService, syncRegistryService } from "./sync-registry.service.js";
import { BackgroundSyncService, backgroundSyncService } from "./background-sync.service.js";
import { SyncTools } from "./sync.tools.js";

@Module({
    name: "sync",
    description: "Device synchronization registry and background service",
    controllers: [
        SyncTools
    ],
    providers: [
        { provide: DeviceDataService, useValue: deviceDataService },
        { provide: ThingsBoardClientService, useValue: thingsboardClientService },
        { provide: SyncRegistryService, useValue: syncRegistryService },
        { provide: BackgroundSyncService, useValue: backgroundSyncService }
    ],
    exports: [
        DeviceDataService,
        SyncRegistryService,
        BackgroundSyncService
    ]
})
export class SyncModule {}
