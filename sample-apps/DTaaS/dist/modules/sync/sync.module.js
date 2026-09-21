var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from "@nitrostack/core";
import { DeviceDataService, deviceDataService } from "./device-data.service.js";
import { ThingsBoardClientService, thingsboardClientService } from "./thingsboard-client.service.js";
import { SyncRegistryService, syncRegistryService } from "./sync-registry.service.js";
import { BackgroundSyncService, backgroundSyncService } from "./background-sync.service.js";
import { SyncTools } from "./sync.tools.js";
let SyncModule = class SyncModule {
};
SyncModule = __decorate([
    Module({
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
], SyncModule);
export { SyncModule };
//# sourceMappingURL=sync.module.js.map