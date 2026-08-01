import { Module } from "@nitrostack/core";
import { ProcurementTools } from "./procurement.tools.js";

@Module({
  name: "procurement",
  description: "AI procurement workflow and approval preparation",
  controllers: [ProcurementTools],
})
export class ProcurementModule {}