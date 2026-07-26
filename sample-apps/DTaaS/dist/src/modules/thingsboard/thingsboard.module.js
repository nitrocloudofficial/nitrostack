var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from "@nitrostack/core";
import { ThingsBoardTools } from "./thingsboard.tools.js";
import { ThingsBoardService } from "./thingsboard.service.js";
import { ThingsBoardResources } from "./thingsboard.resources.js";
let ThingsBoardModule = class ThingsBoardModule {
};
ThingsBoardModule = __decorate([
    Module({
        name: "thingsboard",
        description: "ThingsBoard Tools and Resources",
        controllers: [
            ThingsBoardTools,
            ThingsBoardResources
        ],
        providers: [
            ThingsBoardService
        ]
    })
], ThingsBoardModule);
export { ThingsBoardModule };
//# sourceMappingURL=thingsboard.module.js.map