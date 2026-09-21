import { Module } from "@nitrostack/core";
import { AuditTools } from "./audit.tools.js";

@Module({
  name: "audit",
  description: "Contradiction & vanished-clause auditing with a tamper-proof Black Box ledger",
  controllers: [AuditTools],
})
export class AuditModule {}
