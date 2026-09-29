import { ControllerDecorator as Controller, ToolDecorator as Tool } from "@nitrostack/core";
import { z } from "zod";
import { BenchmarkResultSchema, LighthouseInputSchema } from "../../schemas/benchmark.schemas.js";
import { LighthouseRunnerService } from "../../services/lighthouse-runner.service.js";

@Controller()
export class RunLighthouseTool {
  private runnerService = new LighthouseRunnerService();

  @Tool({
    name: "runLighthouse",
    description: "Runs before/after Lighthouse audit on a target web route.",
    inputSchema: LighthouseInputSchema,
    outputSchema: BenchmarkResultSchema,
  })
  async execute(input: z.infer<typeof LighthouseInputSchema>) {
    const targetUrl = input.url;

    // Run baseline ("before") audit
    const before = await this.runnerService.runAudit(targetUrl, { isPostOptimization: false });

    // Run post-optimization ("after") audit
    const after = await this.runnerService.runAudit(targetUrl, { isPostOptimization: true });

    // Calculate delta metrics
    const delta = this.runnerService.calculateDelta(before, after);

    return {
      before,
      after,
      delta,
    };
  }
}

