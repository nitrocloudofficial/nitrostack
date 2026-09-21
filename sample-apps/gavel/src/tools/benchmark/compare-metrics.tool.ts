import { ControllerDecorator as Controller, ToolDecorator as Tool } from "@nitrostack/core";
import { z } from "zod";
import { BenchmarkResultSchema, CompareMetricsInputSchema } from "../../schemas/benchmark.schemas.js";
import { LighthouseRunnerService } from "../../services/lighthouse-runner.service.js";

@Controller()
export class CompareMetricsTool {
  private runnerService = new LighthouseRunnerService();

  @Tool({
    name: "compareMetrics",
    description: "Diffs baseline metrics against post-implementation metrics.",
    inputSchema: CompareMetricsInputSchema,
    outputSchema: BenchmarkResultSchema,
  })
  async execute(input: z.infer<typeof CompareMetricsInputSchema>) {
    const { beforeMetrics, afterMetrics } = input;
    const delta = this.runnerService.calculateDelta(beforeMetrics, afterMetrics);

    return {
      before: beforeMetrics,
      after: afterMetrics,
      delta,
    };
  }
}

