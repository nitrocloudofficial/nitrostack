import {
  ToolDecorator as Tool,
  ExecutionContext,
  Widget,
  z,
} from "@nitrostack/core";

export class ReportsTools {

  @Tool({
    name: "generate_report",
    description: "Generate an investigation report",

    inputSchema: z.object({
      investigationId: z.string().uuid(),
      format: z.enum(["json", "markdown", "pdf"]).default("markdown"),
    }),
  })
  @Widget("report-card")
  async generateReport(input: any, ctx: ExecutionContext) {

    ctx.logger.info("Generating investigation report");

    return {
      success: true,
      investigationId: input.investigationId,
      format: input.format,
      report: {
        title: "Investigation Report",
        summary: "Generated report placeholder",
      },
    };
  }
}