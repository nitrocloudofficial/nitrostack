/**
 * Runtime configuration tools for the bridge.
 *
 * `configure_llm` lets an administrator drop in an Anthropic API key from
 * inside NitroStudio without restarting the server. It updates the shared
 * LlmService and, if requested, persists to `.env` so the setting survives
 * a restart. Persistence is opt-in — many teams would rather rotate keys
 * per-session.
 */
import { Injectable, ToolDecorator as Tool, ExecutionContext, z, UseGuards } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';
import { AdminGuard } from '../../shared/security/admin.guard.js';
import { LlmService } from '../../shared/services/llm.service.js';
import { WorkspaceService } from '../../shared/services/workspace.service.js';

@Injectable({ deps: [LlmService, WorkspaceService] })
export class BridgeTools {
  constructor(
    private llm: LlmService,
    private workspace: WorkspaceService
  ) {}

  @Tool({
    name: 'configure_llm',
    title: 'Configure LLM (OpenRouter)',
    description:
      'Drop in an OpenRouter API key at runtime so the swarm personas and master orchestrator ' +
      'can make real LLM calls. OpenRouter fronts every major model — Claude, Gemini, GPT, ' +
      'DeepSeek, Llama etc. — behind one credential, so switching models is a string change. ' +
      'Default model is deepseek/deepseek-r1:free (free tier, 20 req/min). Pass persist=true ' +
      'to write OPENROUTER_API_KEY into the project .env so the setting survives a restart. ' +
      'The key is never echoed back; the response only reports whether the credential is ' +
      'now valid.',
    inputSchema: z.object({
      api_key: z
        .string()
        .optional()
        .describe(
          'OpenRouter API key (starts with `sk-or-…`). Get one at https://openrouter.ai/keys. ' +
            'Omit to only change model / effort / disable flags.'
        ),
      model: z
        .string()
        .optional()
        .describe(
          'OpenRouter model id. Examples: deepseek/deepseek-r1:free (default, free), ' +
            'anthropic/claude-3.5-sonnet, google/gemini-2.5-pro, openai/gpt-4o-mini. ' +
            'Full list at https://openrouter.ai/models.'
        ),
      effort: z
        .enum(['low', 'medium', 'high', 'xhigh', 'max'])
        .optional()
        .describe('Reasoning effort hint. Not all models honour it.'),
      disable: z
        .boolean()
        .optional()
        .describe('Turn LLM reasoning off — swarm falls back to deterministic parsers only.'),
      persist: z
        .boolean()
        .default(false)
        .describe('Write the key to .env so it survives a restart. Off by default.'),
    }),
    examples: {
      request: { api_key: 'sk-or-v1-…', model: 'deepseek/deepseek-r1:free', persist: true },
      response: {
        configured: true,
        available: true,
        description: 'deepseek/deepseek-r1:free via OpenRouter @ effort=high',
        source: 'runtime',
        persisted: true,
      },
    },
  })
  @UseGuards(AdminGuard)
  async configureLlm(
    input: {
      api_key?: string;
      model?: string;
      effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
      disable?: boolean;
      persist?: boolean;
    },
    ctx: ExecutionContext
  ) {
    if (!input.api_key && !input.model && !input.effort && !input.disable) {
      // Read-only inspection when no arguments are supplied. Right thing for a
      // Studio user who just wants to know whether the LLM is on.
      return {
        configured: false,
        available: this.llm.available,
        description: this.llm.description,
        source: this.llm.available ? 'env' : 'none',
      };
    }

    const result = this.llm.configure({
      apiKey: input.api_key,
      model: input.model,
      effort: input.effort,
      disable: input.disable,
    });

    let persisted = false;
    let persistError: string | undefined;
    if (input.persist && input.api_key) {
      try {
        this.persistToEnv({
          OPENROUTER_API_KEY: input.api_key.trim(),
          ...(input.model ? { BRIDGE_LLM_MODEL: input.model.trim() } : {}),
          ...(input.effort ? { BRIDGE_LLM_EFFORT: input.effort } : {}),
        });
        persisted = true;
      } catch (error) {
        persistError = error instanceof Error ? error.message : String(error);
      }
    }

    ctx.logger.info('LLM reconfigured', {
      available: result.available,
      description: result.description,
      persisted,
    });

    return {
      configured: true,
      available: result.available,
      description: result.description,
      source: result.source,
      persisted,
      ...(persistError ? { persistError } : {}),
      nextStep: result.available
        ? 'Call run_swarm — persona reasoning and the master orchestrator will now run for real.'
        : 'No credential is active. Supply api_key to enable, or set OPENROUTER_API_KEY in the environment.',
    };
  }

  /**
   * Merge keys into `.env` at the project root, creating it if missing.
   *
   * A minimal upsert rather than a full parser: keys already present are
   * replaced in place, unknown lines are preserved untouched, and the file is
   * written atomically so a crash mid-write cannot leave `.env` half-formed.
   */
  private persistToEnv(entries: Record<string, string>): void {
    const file = path.join(this.workspace.projectRoot, '.env');
    let existing = '';
    try {
      existing = fs.readFileSync(file, 'utf8');
    } catch {
      /* file does not exist yet — that's fine */
    }

    const lines = existing.split(/\r?\n/);
    const written = new Set<string>();
    const updated = lines.map((line) => {
      const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line);
      if (!match) return line;
      const key = match[1];
      if (!(key in entries)) return line;
      written.add(key);
      return `${key}=${this.escapeEnvValue(entries[key])}`;
    });

    for (const [key, value] of Object.entries(entries)) {
      if (!written.has(key)) {
        updated.push(`${key}=${this.escapeEnvValue(value)}`);
      }
    }

    const contents = updated.join('\n').replace(/\n{3,}/g, '\n\n');
    const tmp = `${file}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, contents.endsWith('\n') ? contents : `${contents}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });
    fs.renameSync(tmp, file);
  }

  private escapeEnvValue(value: string): string {
    // Quote when the value contains whitespace, quotes, or #; otherwise leave
    // it bare so common cases stay readable.
    if (/[\s"#$']/.test(value)) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }
}
