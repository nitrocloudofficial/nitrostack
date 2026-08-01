import { Module } from "@nitrostack/core";
import { ApprovalTools } from "./approval.tools.js";

@Module({
  name: "approval",
  description: "Administrator approval decisions and governed execution of prepared actions",
  controllers: [ApprovalTools],
})
export class ApprovalModule {}