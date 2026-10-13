import { Injectable, OnModuleInit } from '@nitrostack/core';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ─── YAML types ────────────────────────────────────────────────────────────────

export type OnErrorPolicy = 'abort' | 'flag_and_abort' | 'flag_and_route' | 'continue';

export interface StepDefinition {
  name: string;
  tool: string;
  on_error: OnErrorPolicy;
}

export interface ExceptionHandler {
  action: string;
  route_to: string;
}

export interface WorkflowDefinition {
  steps: StepDefinition[];
  exception_handlers: Record<string, ExceptionHandler>;
}

interface SopRules {
  workflows: Record<string, WorkflowDefinition>;
}

// ─── Service ──────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
// Walk up: src/modules/orchestrator → src/modules → src → project root
const SOP_PATH = join(__dirname, '..', '..', '..', 'sop_rules.yaml');

@Injectable()
export class SopLoaderService implements OnModuleInit {
  private rules!: SopRules;

  onModuleInit() {
    this.reload();
  }

  /** Re-reads from disk — useful if rules change without a full restart. */
  reload(): void {
    if (!existsSync(SOP_PATH)) {
      throw new Error(`[SopLoaderService] sop_rules.yaml not found at ${SOP_PATH}`);
    }

    // Inline lightweight YAML parser — avoids an extra dependency.
    // Only supports the exact structure used in sop_rules.yaml.
    const raw = readFileSync(SOP_PATH, 'utf-8');
    this.rules = this.parseYaml(raw);

    const workflowCount = Object.keys(this.rules.workflows).length;
    console.error(`[SopLoaderService] Loaded ${workflowCount} workflow(s) from sop_rules.yaml ✓`);
  }

  getWorkflow(workflowId: string): WorkflowDefinition {
    const def = this.rules.workflows[workflowId];
    if (!def) {
      throw new Error(
        `[SopLoaderService] Unknown workflow "${workflowId}". ` +
        `Available: ${Object.keys(this.rules.workflows).join(', ')}`,
      );
    }
    return def;
  }

  listWorkflows(): string[] {
    return Object.keys(this.rules.workflows);
  }

  // ── Minimal YAML parser ────────────────────────────────────────────────────
  // Only handles the subset of YAML that sop_rules.yaml uses.
  // Replaces the need for 'js-yaml' which adds ~100 kB to the bundle.

  private parseYaml(raw: string): SopRules {
    const result: SopRules = { workflows: {} };
    const lines = raw.split('\n').map((l) => l.replace(/\r$/, ''));

    let currentWorkflow = '';
    let currentStep: Partial<StepDefinition> | null = null;
    let inSteps = false;
    let inHandlers = false;
    let currentHandler = '';

    const flush = () => {
      if (currentStep && currentWorkflow && currentStep.name && currentStep.tool) {
        result.workflows[currentWorkflow].steps.push(currentStep as StepDefinition);
      }
      currentStep = null;
    };

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const indent = line.length - line.trimStart().length;

      // workflows:
      if (trimmed === 'workflows:') continue;

      // workflows.invoice_processing:
      if (indent === 2 && trimmed.endsWith(':') && !trimmed.startsWith('-')) {
        flush();
        currentWorkflow = trimmed.slice(0, -1);
        result.workflows[currentWorkflow] = { steps: [], exception_handlers: {} };
        inSteps = false;
        inHandlers = false;
        continue;
      }

      // steps: / exception_handlers:
      if (indent === 4 && trimmed === 'steps:') { flush(); inSteps = true; inHandlers = false; continue; }
      if (indent === 4 && trimmed === 'exception_handlers:') { flush(); inHandlers = true; inSteps = false; continue; }

      // step list item
      if (inSteps && indent === 6 && trimmed.startsWith('- ')) {
        flush();
        const kv = trimmed.slice(2).split(': ');
        currentStep = {};
        if (kv.length === 2) {
          const k = kv[0] as keyof StepDefinition;
          (currentStep as any)[k] = kv[1].replace(/^"|"$/g, '');
        }
        continue;
      }
      if (inSteps && indent === 8 && currentStep) {
        const [k, ...rest] = trimmed.split(': ');
        (currentStep as any)[k] = rest.join(': ').replace(/^"|"$/g, '');
        continue;
      }

      // exception handler name
      if (inHandlers && indent === 6 && trimmed.endsWith(':')) {
        currentHandler = trimmed.slice(0, -1);
        result.workflows[currentWorkflow].exception_handlers[currentHandler] = {
          action: '',
          route_to: '',
        };
        continue;
      }
      if (inHandlers && indent === 8 && currentHandler) {
        const [k, ...rest] = trimmed.split(': ');
        const handler = result.workflows[currentWorkflow].exception_handlers[currentHandler];
        if (k === 'action')   handler.action   = rest.join(': ').replace(/^"|"$/g, '');
        if (k === 'route_to') handler.route_to = rest.join(': ').replace(/^"|"$/g, '');
        continue;
      }
    }

    flush();
    return result;
  }
}
