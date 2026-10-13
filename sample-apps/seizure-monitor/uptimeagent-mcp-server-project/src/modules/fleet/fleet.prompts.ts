import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class FleetPrompts {
  @Prompt({
    name: 'diagnose-issue',
    description: 'Guided diagnostic conversation starter for a specific machine, e.g. "why is engine 12 vibrating abnormally?"',
    arguments: [
      {
        name: 'machineId',
        description: 'Machine/engine id to diagnose, e.g. "engine-03"',
        required: true
      },
      {
        name: 'question',
        description: 'Optional specific question about the machine (e.g. "vibrating abnormally")',
        required: false
      }
    ]
  })
  async diagnoseIssue(args: { machineId: string; question?: string }, ctx: ExecutionContext) {
    ctx.logger.info('Generating diagnose-issue prompt', { machineId: args.machineId });

    const userQuestion = args.question
      ? `Why is ${args.machineId} ${args.question}?`
      : `How is ${args.machineId} doing? Diagnose any issues.`;

    return [
      {
        role: 'user' as const,
        content: userQuestion
      },
      {
        role: 'assistant' as const,
        content:
          `I'll investigate ${args.machineId} step by step:\n\n` +
          `1. Call analyze_sensor_reading("${args.machineId}") to check current readings against its healthy baseline and detect any anomaly.\n` +
          `2. If an anomaly is found, call predict_failure_window("${args.machineId}") to estimate remaining useful life.\n` +
          `3. If the issue is significant (high severity, or failure risk within ~30 days), call generate_work_order("${args.machineId}") to produce an actionable maintenance ticket with a recommended repair action.\n\n` +
          `Let me start by analyzing the sensor readings.`
      }
    ];
  }
}
