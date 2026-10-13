import { Module } from "@nitrostack/core";

import { EntityTools } from "./entities.tools.js";
import { EntityResources } from "./entities.resources.js";
import { EntityPrompts } from "./entities.prompts.js";

@Module({
  name: "entities",
  description: "Investigation Entities Module",
  controllers: [
    EntityTools,
    EntityResources,
    EntityPrompts,
  ],
})
export class EntityModule {}