import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class SumoPrompts {
  @Prompt({
    name: 'run_full_sumo_pipeline',
    description: 'Automate the end-to-end SUMO traffic simulation workflow from network download to analytics.',
    arguments: [
      { name: 'bbox', description: 'Bounding box coordinates (min_lon,min_lat,max_lon,max_lat)', required: true },
      { name: 'trips', description: 'Total number of vehicle trips to simulate', required: false }
    ]
  })
  async getPipelinePrompt(args: { bbox: string; trips?: string }, ctx: ExecutionContext) {
    return {
      messages: [
        {
          role: 'user',
          content: `Execute the SUMO simulation pipeline using bounding box '${args.bbox}' and ${args.trips || '200'} trips. Follow these steps sequentially:\n1. generate_network\n2. generate_routes\n3. run_headless_simulation\n4. run_gui_simulation\n5. analyze_results`
        }
      ]
    };
  }
}
