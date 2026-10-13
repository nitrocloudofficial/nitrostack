import { Module } from "@nitrostack/core";
import { ReportTools } from "./report.tools.js";

@Module({
  name: "report",
  description: "Reads threat-intel reports from untrusted URLs, quarantining any prompt-injection attempt before it reaches the model.",
  controllers: [ReportTools],
})
export class ReportModule {}
