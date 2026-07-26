import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class AgentPrompts {
  @Prompt({
    name: 'build_classifier',
    description: 'Guide the assistant to build an image classifier end-to-end using the ModelSmithAI tools',
    arguments: [
      {
        name: 'request',
        description: "What to recognize, e.g. 'husky vs wolf vs malamute'",
        required: true
      }
    ]
  })
  async buildClassifier(args: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating build_classifier prompt');
    const request = args.request || 'cat vs dog';

    return [
      {
        role: 'user' as const,
        content: `Build an image classifier for: "${request}".`
      },
      {
        role: 'assistant' as const,
        content: `I will build it end-to-end:

1. Call build_model with request="${request}" (it returns a job_id immediately - the run takes minutes).
2. Call get_build_status with that job_id and keep checking until status is "done".
3. When finished, summarize the final accuracy, the security verdict (SAFE/DANGEROUS), and the SafeTensors path.
4. Offer to generate the PDF audit report with generate_report using the run's state.json path.

Starting the build now.`
      }
    ];
  }

  @Prompt({
    name: 'scan_model_safety',
    description: 'Guide the assistant to check whether a model file is safe and convert it to SafeTensors',
    arguments: [
      {
        name: 'path',
        description: 'Path to the .pt model file to inspect',
        required: true
      }
    ]
  })
  async scanModelSafety(args: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating scan_model_safety prompt');
    const path = args.path || 'model.pt';

    return [
      {
        role: 'user' as const,
        content: `Is the model file at "${path}" safe to load?`
      },
      {
        role: 'assistant' as const,
        content: `I will check it safely, without loading it:

1. Call scan_pickle on "${path}" and report the verdict (SAFE / SUSPICIOUS / DANGEROUS) with any evidence.
2. If it is not clearly SAFE, I will NOT load it.
3. Call convert_safetensors to produce a safe SafeTensors version (no code-execution path) and report the output path.

Running the scan now.`
      }
    ];
  }
}
