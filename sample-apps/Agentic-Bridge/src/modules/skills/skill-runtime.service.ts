/**
 * SkillRuntime — the metaprogramming core.
 *
 * When the swarm discovers something idiosyncratic in a legacy codebase (a
 * hand-rolled ORM, a bespoke config format, an in-house RPC convention), a
 * paragraph in a markdown file is not much use to the next agent. What is
 * useful is an executable MCP tool that knows how to drive that thing safely.
 *
 * This service turns a declarative SkillSpec into exactly that, twice over:
 *
 *   1. It writes real, reviewable NitroStack source to `src/skills/<name>.skill.ts`
 *      with a proper `@Tool` decorator — so the skill is permanent, lives in
 *      version control, and boots as a first-class tool next time.
 *   2. It compiles the same spec into a live handler and registers it on the
 *      RUNNING server via `NitroStackServer.tool()` + `notifyToolsListChanged()`,
 *      so the new tool appears in the connected client's tool list immediately.
 *      No restart, no redeploy.
 *
 * ── Security posture ────────────────────────────────────────────────────────
 * Skill bodies execute in-process via `new AsyncFunction`. That is NOT a
 * security sandbox and is not presented as one. The mitigations that ARE real:
 *
 *   - a static deny-list rejects `require`, `import`, `process`, `eval`,
 *     `child_process`, `globalThis` and friends before anything is compiled;
 *   - the body receives no module scope — only a curated `api` object whose
 *     every filesystem call is routed through WorkspaceService, so it inherits
 *     the same allow-list and traversal budget as the rest of the swarm;
 *   - generation is disabled unless BRIDGE_ALLOW_SKILL_GENERATION is unset or
 *     'true', giving an operator a single switch to turn it off in a shared env.
 *
 * The threat model this is right for: a developer running the bridge against
 * their own codebase. It is deliberately not right for accepting skill bodies
 * from untrusted third parties, and the README says so.
 */
import { Injectable, Tool, z } from '@nitrostack/core';
import type { ExecutionContext } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';
import { WorkspaceService } from '../../shared/services/workspace.service.js';
import { StoreService } from '../../shared/services/store.service.js';
import { registerLiveTool } from '../../shared/services/server-registry.js';
import type { GeneratedSkill, SkillSpec } from '../../shared/schemas/index.js';

/** Constructs that must never appear in a generated skill body. */
const FORBIDDEN: { pattern: RegExp; label: string }[] = [
  { pattern: /\brequire\s*\(/, label: 'require()' },
  { pattern: /\bimport\s*[({]/, label: 'dynamic import()' },
  { pattern: /\bprocess\b/, label: 'process' },
  { pattern: /\bglobalThis\b/, label: 'globalThis' },
  { pattern: /\beval\s*\(/, label: 'eval()' },
  { pattern: /\bFunction\s*\(/, label: 'Function constructor' },
  { pattern: /\bchild_process\b/, label: 'child_process' },
  { pattern: /\b__dirname|__filename\b/, label: '__dirname/__filename' },
  { pattern: /\bfetch\s*\(/, label: 'fetch()' },
  { pattern: /\bconstructor\s*\[/, label: 'constructor escape' },
];

/** The surface a skill body is allowed to touch. */
export interface SkillApi {
  /** Read a file relative to the analysis target. Returns null if unreadable. */
  readFile(relativePath: string): string | null;
  /** List repo-relative paths under the target, optionally filtered by a substring. */
  listFiles(filter?: string): string[];
  /** Search every text file for a pattern. Returns matches with line numbers. */
  grep(pattern: string, maxResults?: number): { path: string; line: number; text: string }[];
  /** The absolute target root this skill is bound to. */
  root: string;
}

/**
 * Dynamic code execution — intentional, and the point of this module.
 *
 * The whole feature is "the swarm writes a new tool and it becomes callable",
 * which cannot be done without compiling a body at runtime. This is NOT parsing
 * data (JSON.parse would be correct for that) — it is executing a tool
 * implementation authored by the swarm or the operator on their own machine.
 *
 * Guards, in order: the FORBIDDEN deny-list above runs first and rejects module
 * access, `process`, nested eval and network calls; the compiled function is
 * given no module scope, only `params` and the WorkspaceService-backed `api`;
 * and BRIDGE_ALLOW_SKILL_GENERATION=false disables the path entirely.
 * See the security-posture block at the top of this file for the threat model.
 */
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
  ...args: string[]
) => (...args: unknown[]) => Promise<unknown>;

@Injectable({ deps: [WorkspaceService, StoreService] })
export class SkillRuntimeService {
  constructor(
    private workspace: WorkspaceService,
    private store: StoreService
  ) {}

  get generationEnabled(): boolean {
    const flag = process.env.BRIDGE_ALLOW_SKILL_GENERATION;
    return flag === undefined || flag.toLowerCase() === 'true';
  }

  /** Reject a body containing anything on the deny-list, with a specific message. */
  validateBody(body: string): void {
    for (const { pattern, label } of FORBIDDEN) {
      if (pattern.test(body)) {
        throw new Error(
          `Skill body rejected: it references ${label}, which is not permitted. ` +
            `Skill bodies may only use the provided \`api\` object (readFile, listFiles, grep, root) ` +
            `and standard JavaScript built-ins.`
        );
      }
    }
  }

  /** Build the restricted API a skill body executes against. */
  buildApi(target: string): SkillApi {
    const walkOnce = () => this.workspace.walk(target).files;
    return {
      root: target,
      readFile: (relativePath: string) => {
        const abs = path.resolve(target, relativePath);
        const rel = path.relative(target, abs);
        if (rel.startsWith('..') || path.isAbsolute(rel)) return null; // containment
        return this.workspace.read(abs);
      },
      listFiles: (filter?: string) => {
        const all = walkOnce().map((f) => this.workspace.rel(target, f));
        return filter ? all.filter((f) => f.includes(filter)) : all;
      },
      grep: (pattern: string, maxResults = 100) => {
        let re: RegExp;
        try {
          re = new RegExp(pattern, 'i');
        } catch {
          throw new Error(`Invalid grep pattern: ${pattern}`);
        }
        const out: { path: string; line: number; text: string }[] = [];
        for (const abs of walkOnce()) {
          if (out.length >= maxResults) break;
          const content = this.workspace.read(abs);
          if (content === null) continue;
          const lines = content.split('\n');
          for (let i = 0; i < lines.length && out.length < maxResults; i++) {
            if (re.test(lines[i])) {
              out.push({ path: this.workspace.rel(target, abs), line: i + 1, text: lines[i].trim().slice(0, 300) });
            }
          }
        }
        return out;
      },
    };
  }

  /** Compile a spec's body into an executable handler. Throws on syntax errors. */
  compile(spec: SkillSpec): (params: Record<string, unknown>, api: SkillApi) => Promise<unknown> {
    this.validateBody(spec.body);
    let fn: (...args: unknown[]) => Promise<unknown>;
    try {
      fn = new AsyncFunction('params', 'api', spec.body);
    } catch (error) {
      throw new Error(
        `Skill body failed to compile: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    return (params, api) => fn(params, api) as Promise<unknown>;
  }

  /** Turn the declarative param list into a Zod object schema. */
  buildInputSchema(spec: SkillSpec): z.ZodObject<z.ZodRawShape> {
    const shape: z.ZodRawShape = {
      target: z
        .string()
        .optional()
        .describe('Absolute path to the codebase. Omit to use the bundled legacy fixture.'),
    };
    for (const param of spec.params) {
      const base =
        param.type === 'number' ? z.number() : param.type === 'boolean' ? z.boolean() : z.string();
      shape[param.name] = (param.required ? base : base.optional()).describe(param.description);
    }
    return z.object(shape);
  }

  /**
   * Register the skill on the live server so it shows up in the client's tool
   * list right now. Returns false if the server handle is not available yet.
   */
  registerLive(spec: SkillSpec): boolean {
    const handler = this.compile(spec);

    const tool = new Tool({
      name: spec.name,
      title: spec.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      description: `[generated skill] ${spec.description}`,
      inputSchema: this.buildInputSchema(spec),
      annotations: { readOnlyHint: true },
      handler: async (input: unknown, ctx: ExecutionContext) => {
        const params = (input ?? {}) as Record<string, unknown>;
        // Minted skills inherit remote-target support: a generated tool is only
        // as portable as the traversal underneath it.
        const handle = await this.workspace.acquireTarget(params.target as string | undefined);
        try {
          ctx.logger.info(`Generated skill invoked: ${spec.name}`, { target: handle.label });
          const result = await handler(params, this.buildApi(handle.root));
          return { skill: spec.name, target: handle.label, result };
        } finally {
          await handle.cleanup();
        }
      },
    });

    return registerLiveTool(tool);
  }

  /**
   * Emit real NitroStack source for the skill so it survives a restart and is
   * reviewable in a pull request like any other tool.
   */
  writeSource(spec: SkillSpec): string {
    const className = spec.name
      .split('_')
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join('');
    const file = path.join(this.workspace.skillsRoot, `${spec.name}.skill.ts`);

    const zodFields = spec.params
      .map((p) => {
        const base = p.type === 'number' ? 'z.number()' : p.type === 'boolean' ? 'z.boolean()' : 'z.string()';
        const opt = p.required ? '' : '.optional()';
        return `      ${p.name}: ${base}${opt}.describe(${JSON.stringify(p.description)}),`;
      })
      .join('\n');

    const source = `/**
 * ${spec.name} — generated skill.
 *
 * Minted by the Enterprise Agentic Bridge swarm on ${new Date().toISOString()}.
 * ${spec.rationale || 'Discovered during automated reconnaissance of the legacy codebase.'}
 *
 * This file is generated. Edit the SkillSpec and re-run generate_custom_skill,
 * or take ownership of it and delete this banner.
 */
import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { WorkspaceService } from '../shared/services/workspace.service.js';
import { SkillRuntimeService } from '../modules/skills/skill-runtime.service.js';

const SKILL_BODY = ${JSON.stringify(spec.body)};

export class ${className}Skill {
  constructor(
    private workspace: WorkspaceService,
    private runtime: SkillRuntimeService
  ) {}

  @Tool({
    name: ${JSON.stringify(spec.name)},
    description: ${JSON.stringify(`[generated skill] ${spec.description}`)},
    inputSchema: z.object({
      target: z
        .string()
        .optional()
        .describe('GitHub repository URL or absolute path. Omit for the bundled fixture.'),
${zodFields}
    }),
    annotations: { readOnlyHint: true },
  })
  async run(input: Record<string, unknown>, ctx: ExecutionContext) {
    const handle = await this.workspace.acquireTarget(input.target as string | undefined);
    try {
      ctx.logger.info('Generated skill invoked: ${spec.name}', { target: handle.label });
      const handler = this.runtime.compile({
        name: ${JSON.stringify(spec.name)},
        description: ${JSON.stringify(spec.description)},
        params: ${JSON.stringify(spec.params)},
        body: SKILL_BODY,
        rationale: ${JSON.stringify(spec.rationale)},
      });
      const result = await handler(input, this.runtime.buildApi(handle.root));
      return { skill: ${JSON.stringify(spec.name)}, target: handle.label, result };
    } finally {
      await handle.cleanup();
    }
  }
}
`;

    fs.mkdirSync(this.workspace.skillsRoot, { recursive: true });
    fs.writeFileSync(file, source, 'utf8');
    return file;
  }

  /** Persist the skill in the registry so it survives restarts and lands in CLAUDE.md. */
  record(spec: SkillSpec, sourceFile: string, registered: boolean, createdBy: string): GeneratedSkill {
    const entry: GeneratedSkill = {
      ...spec,
      createdAt: new Date().toISOString(),
      createdBy,
      sourceFile: this.workspace.rel(this.workspace.projectRoot, sourceFile),
      registered,
    };
    const existing = this.store.all('skills').filter((s) => s.name !== spec.name);
    this.store.replace('skills', [...existing, entry]);
    return entry;
  }

  /**
   * Re-register every previously generated skill on boot, so a restart does not
   * lose the swarm's work even before the emitted source files are wired in.
   */
  rehydrate(): { restored: string[]; failed: { name: string; error: string }[] } {
    const restored: string[] = [];
    const failed: { name: string; error: string }[] = [];
    for (const skill of this.store.all('skills')) {
      try {
        if (this.registerLive(skill)) restored.push(skill.name);
      } catch (error) {
        failed.push({ name: skill.name, error: error instanceof Error ? error.message : String(error) });
      }
    }
    return { restored, failed };
  }
}
