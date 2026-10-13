import { Module } from "@nitrostack/core";
import { RemediationTools } from "./remediation.tools.js";

@Module({
  name: "remediation",
  description: "Scans dependency manifests against OSV.dev, ranks findings by exploitation evidence, plans a fix, patches, and verifies it.",
  controllers: [RemediationTools],
})
export class RemediationModule {}
