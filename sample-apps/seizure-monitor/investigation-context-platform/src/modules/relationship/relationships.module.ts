import { Module } from "@nitrostack/core";

import { RelationshipTools } from "./relationships.tools.js";
import { RelationshipResources } from "./relationships.resources.js";
import { RelationshipPrompts } from "./relationships.prompts.js";

@Module({
  name: "relationships",
  description: "Relationship Graph",

  controllers: [
    RelationshipTools,
    RelationshipResources,
    RelationshipPrompts,
  ],
})
export class RelationshipModule {}