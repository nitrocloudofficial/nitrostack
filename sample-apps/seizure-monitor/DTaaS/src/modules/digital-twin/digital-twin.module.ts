import { Module } from "@nitrostack/core";

import { DigitalTwinTools } from "./digital-twin.tools.js";
import { DigitalTwinPrompts } from "./digital-twin.prompts.js";

@Module({
    name: "digital-twin",
    description: "AI powered Digital Twin creation",

    controllers: [
        DigitalTwinTools,
        DigitalTwinPrompts
    ]
})
export class DigitalTwinModule {}