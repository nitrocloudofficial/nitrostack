import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';

const SIDECAR = 'http://localhost:8000';

async function callSidecar(path: string, body: any, ctx: ExecutionContext): Promise<any> {
  ctx.logger.info(`sidecar ${path}`, body);
  const res = await fetch(`${SIDECAR}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`sidecar ${path} failed (${res.status}): ${text}`);
  }
  return await res.json();
}

export class AgentTools {
  // ---------------------------------------------------------------- Planner
  @Tool({
    name: 'plan',
    description: 'Planner agent: turn a natural-language request into a class list, per-class search queries, and a target accuracy.',
    inputSchema: z.object({
      request: z.string().describe("e.g. 'husky vs wolf vs malamute'"),
      target_accuracy: z.number().optional().describe('stop when reached (default 0.85)'),
      images_per_class: z.number().optional().describe('initial images per class (default 30)'),
      max_iterations: z.number().optional().describe('hard loop cap (default 3)'),
    }),
  })
  async plan(input: any, ctx: ExecutionContext) {
    return callSidecar('/plan', {
      request: input.request,
      target_accuracy: input.target_accuracy ?? 0.85,
      images_per_class: input.images_per_class ?? 30,
      max_iterations: input.max_iterations ?? 3,
    }, ctx);
  }

  // ---------------------------------------------------------------- Scout
  @Tool({
    name: 'scout',
    description: 'Scout agent: fetch open-licensed images for a query from multiple sources into a folder. Returns per-source counts and licenses.',
    inputSchema: z.object({
      query: z.string().describe('search term, e.g. "husky dog"'),
      n: z.number().describe('how many images to fetch'),
      out_dir: z.string().describe('destination folder, e.g. C:/hack/storage/images/husky'),
    }),
  })
  async scout(input: any, ctx: ExecutionContext) {
    return callSidecar('/scout', {
      query: input.query, n: input.n, out_dir: input.out_dir,
    }, ctx);
  }

  // ---------------------------------------------------------------- Curator
  @Tool({
    name: 'curate',
    description: 'Curator agent: verify each image really matches its class (zero-shot CLIP), remove duplicates, and cache embeddings for training. Rejected images are moved to _rejected/.',
    inputSchema: z.object({
      images_root: z.string().describe('folder of class subfolders, e.g. C:/hack/storage/images'),
      threshold: z.number().optional().describe('min CLIP confidence to keep (default 0.24)'),
    }),
  })
  async curate(input: any, ctx: ExecutionContext) {
    return callSidecar('/curate', {
      images_root: input.images_root,
      threshold: input.threshold ?? 0.24,
    }, ctx);
  }

  // ---------------------------------------------------------------- Trainer
  @Tool({
    name: 'train',
    description: 'Trainer agent: fit a classifier head on cached CLIP embeddings and write a real model.pt. Returns accuracy, per-class recall, and confusion pairs. Run curate first.',
    inputSchema: z.object({
      images_root: z.string().describe('folder previously processed by curate, e.g. C:/hack/storage/images'),
    }),
  })
  async train(input: any, ctx: ExecutionContext) {
    return callSidecar('/train', { images_root: input.images_root }, ctx);
  }

  // ---------------------------------------------------------------- Diagnostician
  @Tool({
    name: 'diagnose',
    description: 'Diagnostician agent: read a training report and decide STOP (target met) or CONTINUE with a structured re-fetch request naming which classes to strengthen and why.',
    inputSchema: z.object({
      train_report: z.any().describe('the JSON object returned by the train tool'),
      target_accuracy: z.number().optional().describe('default 0.85'),
    }),
  })
  async diagnose(input: any, ctx: ExecutionContext) {
    return callSidecar('/diagnose', {
      train_report: input.train_report,
      target_accuracy: input.target_accuracy ?? 0.85,
    }, ctx);
  }

  // ---------------------------------------------------------------- Sentinel: scan
  @Tool({
    name: 'scan_pickle',
    description: 'Sentinel agent: forensically scan a .pt/.ckpt for malicious pickle opcodes without loading it. Walks every archive entry by content (defeats extension-hiding, CVE-2025-1889). Returns SAFE / SUSPICIOUS / DANGEROUS with evidence.',
    inputSchema: z.object({
      path: z.string().describe('path to the model file, e.g. C:/hack/storage/model.pt'),
    }),
  })
  async scanPickle(input: any, ctx: ExecutionContext) {
    return callSidecar('/scan', { path: input.path }, ctx);
  }

  // ---------------------------------------------------------------- Sentinel: convert
  @Tool({
    name: 'convert_safetensors',
    description: 'Sentinel agent: safely load weights (weights_only) and re-save as SafeTensors, a format with no code-execution path. Conversion is a guarantee, not a detection.',
    inputSchema: z.object({
      path: z.string().describe('path to the .pt model'),
      out_path: z.string().optional().describe('optional output path'),
    }),
  })
  async convertSafetensors(input: any, ctx: ExecutionContext) {
    return callSidecar('/convert', {
      path: input.path, out_path: input.out_path ?? null,
    }, ctx);
  }

  // ---------------------------------------------------------------- Orchestrator
  @Tool({
    name: 'build_model',
    description: 'Start the full multi-agent build loop (Planner -> Scout -> Curator -> Trainer -> Diagnostician loop -> Sentinel). Returns IMMEDIATELY with a job_id because the run takes minutes. Then call get_build_status with that job_id to watch progress and get the final model. Do NOT wait on this call.',
    inputSchema: z.object({
      request: z.string().describe("what to build, e.g. 'husky vs wolf vs malamute'"),
      target_accuracy: z.number().optional().describe('default 0.85'),
      images_per_class: z.number().optional().describe('initial images per class (default 12)'),
      max_iterations: z.number().optional().describe('default 3'),
    }),
  })
  async buildModel(input: any, ctx: ExecutionContext): Promise<any> {
    const res: any = await callSidecar('/build_async', {
      request: input.request,
      target_accuracy: input.target_accuracy ?? 0.85,
      images_per_class: input.images_per_class ?? 12,
      max_iterations: input.max_iterations ?? 3,
    }, ctx);
    return {
      ...res,
      note: 'Build started. Call get_build_status with this job_id to check progress.',
    };
  }

  // ---------------------------------------------------------------- Build status
  @Tool({
    name: 'get_build_status',
    description: 'Check the status of a build started by build_model. Returns status (running/done/error), the agent event log so far, and — when done — the final model with accuracy and security verdict. Poll this every few seconds until status is "done".',
    inputSchema: z.object({
      job_id: z.string().describe('the job_id returned by build_model'),
    }),
  })
  async getBuildStatus(input: any, ctx: ExecutionContext): Promise<any> {
    ctx.logger.info('build status', { job_id: input.job_id });
    const res = await fetch(`${SIDECAR}/status/${input.job_id}`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`status check failed (${res.status}): ${text}`);
    }
    return await res.json();
  }

  // ---------------------------------------------------------------- Audit report
  @Tool({
    name: 'generate_report',
    description: 'Generate a professional PDF audit report for a completed build: request, classes, accuracy per iteration, data sources & licenses, the full agent decision log, and the security verdict. Provide the state.json path from a build result.',
    inputSchema: z.object({
      state_path: z.string().describe('path to the run state.json, e.g. C:/hack/storage/runs/<run>/state.json'),
    }),
  })
  async generateReport(input: any, ctx: ExecutionContext) {
    return callSidecar('/report', { state_path: input.state_path }, ctx);
  }
}
