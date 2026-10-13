import { Module } from "@nitrostack/core";

import { EvidenceTools } from "./evidence.tools.js";
import { EvidenceResources } from "./evidence.resources.js";
import { EvidencePrompts } from "./evidence.prompts.js";

@Module({
  name: "evidence",
  description: "Evidence Management Module",
  controllers: [
    EvidenceTools,
    EvidenceResources,
    EvidencePrompts,
  ],
})
export class EvidenceModule {}