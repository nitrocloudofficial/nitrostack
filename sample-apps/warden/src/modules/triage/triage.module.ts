import { Module } from "@nitrostack/core";
import { TriageService } from "./triage.service.js";
import { TriageTools } from "./triage.tools.js";

@Module({
  name: "triage",
  description: "Routes security findings to safe automatic remediation, reviewed remediation, or human-owned queues.",
  controllers: [TriageTools],
  providers: [TriageService],
})
export class TriageModule {}
