import { Module } from "@nitrostack/core";
import { MitigationTools } from "./mitigation.tools.js";

@Module({
  name: "mitigation",
  description: "Suggests compensating controls for findings that have no fix yet.",
  controllers: [MitigationTools],
})
export class MitigationModule {}
