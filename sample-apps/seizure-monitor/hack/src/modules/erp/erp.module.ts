import { Module } from "@nitrostack/core";
import { ErpTools } from "./erp.tools.js";

@Module({
  name: "erp",
  description: "Natural-language ERP data querying tools.",
  controllers: [ErpTools],
})
export class ErpModule {}
