import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';

export class AgentResources {
  @Resource({
    uri: 'modelsmith://pipeline',
    name: 'ModelSmithAI Pipeline',
    description: 'Reference describing the six-agent pipeline, each tool, and the self-improving loop.',
    mimeType: 'application/json',
    examples: {
      response: {
        product: 'ModelSmithAI',
        agents: ['Planner', 'Scout', 'Curator', 'Trainer', 'Diagnostician', 'Sentinel']
      }
    }
  })
  async getPipeline(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching ModelSmithAI pipeline reference');

    const pipeline = {
      product: 'ModelSmithAI - autonomous model factory',
      backend: 'Python sidecar (FastAPI) exposed as thin MCP tools',
      agents: [
        { name: 'Planner', tool: 'plan', role: 'Parse a natural-language request into a class list, per-class queries, and a target accuracy.' },
        { name: 'Scout', tool: 'scout', role: 'Fetch open-licensed images from Openverse/Wikimedia; record source + license per image.' },
        { name: 'Curator', tool: 'curate', role: 'Verify each image with zero-shot CLIP, deduplicate, and cache embeddings.' },
        { name: 'Trainer', tool: 'train', role: 'Train a logistic head on cached CLIP embeddings; report accuracy, per-class recall, confusion pairs.' },
        { name: 'Diagnostician', tool: 'diagnose', role: 'Decide STOP (target met) or issue a structured per-class re-fetch request.' },
        { name: 'Sentinel', tool: 'scan_pickle / convert_safetensors', role: 'Scan the model for malicious pickle opcodes and convert it to SafeTensors.' }
      ],
      orchestration: {
        build_model: 'Starts the full loop asynchronously; returns a job_id immediately.',
        get_build_status: 'Polls a running build for progress, events, and the final model.',
        generate_report: 'Produces a PDF audit report from a run state.json.'
      },
      loop: 'Planner -> Scout -> Curator -> Trainer -> Diagnostician (loop back to Scout on weak classes) -> Sentinel -> Report. Stops on: target met, no improvement, or max iterations.',
      security: 'Every model is scanned (load-free pickle disassembly, by content not extension) and converted to SafeTensors (no code-execution path).'
    };

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(pipeline, null, 2)
      }]
    };
  }
}
