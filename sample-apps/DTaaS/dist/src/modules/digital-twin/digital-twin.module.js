var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from "@nitrostack/core";
import { DigitalTwinTools } from "./digital-twin.tools.js";
import { DigitalTwinPrompts } from "./digital-twin.prompts.js";
let DigitalTwinModule = class DigitalTwinModule {
};
DigitalTwinModule = __decorate([
    Module({
        name: "digital-twin",
        description: "AI powered Digital Twin creation",
        controllers: [
            DigitalTwinTools,
            DigitalTwinPrompts
        ]
    })
], DigitalTwinModule);
export { DigitalTwinModule };
//# sourceMappingURL=digital-twin.module.js.map