import { Injectable, ToolDecorator as Tool, Widget, ExecutionContext, z, UseGuards } from '@nitrostack/core';
import { AdminGuard } from '../../shared/security/admin.guard.js';
import { SkillRuntimeService } from './skill-runtime.service.js';
import { WorkspaceService } from '../../shared/services/workspace.service.js';
import { StoreService } from '../../shared/services/store.service.js';
import { SkillSpecSchema } from '../../shared/schemas/index.js';
import type { KnowledgeFact, SkillSpec } from '../../shared/schemas/index.js';

@Injectable({ deps: [SkillRuntimeService, WorkspaceService, StoreService] })
export class SkillsTools {
  constructor(
    private runtime: SkillRuntimeService,
    private workspace: WorkspaceService,
    private store: StoreService
  ) {}

  @Tool({
    name: 'generate_custom_skill',
    title: 'Generate a custom skill',
    description:
      'Metaprogramming. Mints a brand-new MCP tool from a declarative spec and registers it ' +
      'on the RUNNING server immediately — the new tool appears in your client\'s tool list ' +
      'without a restart. It also emits real, reviewable NitroStack source into src/skills/ ' +
      'so the skill is permanent and version-controlled. Use this when the swarm finds a ' +
      'legacy interface (a hand-rolled ORM, a bespoke config format) that deserves a ' +
      'programmatic tool rather than a paragraph of documentation.',
    inputSchema: SkillSpecSchema.extend({
      dry_run: z
        .boolean()
        .default(false)
        .describe('Validate and compile the spec without writing files or registering the tool'),
    }),
    examples: {
      request: {
        name: 'query_aurora_orm',
        description: 'Find every call site of the legacy AuroraORM fluent chain and report the tables touched',
        params: [{ name: 'table', type: 'string', description: 'Optional table filter', required: false }],
        body: "const hits = api.grep(\"Orm\\\\.q\\\\('\"); return { callSites: hits.length, hits };",
        rationale: 'AuroraORM is a 2009 in-house mapper with no modern equivalent; agents need a safe way to inspect its usage.',
      },
      response: { generated: true, registeredLive: true, sourceFile: 'src/skills/query_aurora_orm.skill.ts' },
    },
  })
  @Widget('skill-forge')
  @UseGuards(AdminGuard)
  async generateCustomSkill(input: SkillSpec & { dry_run?: boolean }, ctx: ExecutionContext) {
    if (!this.runtime.generationEnabled) {
      throw new Error(
        'Skill generation is disabled. Unset BRIDGE_ALLOW_SKILL_GENERATION or set it to "true" to enable it.'
      );
    }

    const { dry_run, ...spec } = input;

    // Refuse to shadow a built-in tool — a generated skill silently overriding
    // map_file_dependencies would be a genuinely nasty failure mode.
    const reserved = [
      'map_file_dependencies', 'find_change_surface', 'parse_package_specs', 'extract_test_strategy',
      'parse_ci_cd_pipelines', 'parse_design_system', 'fetch_sprint_goals', 'fetch_meeting_transcripts',
      'detect_conflicts', 'resolve_conflict', 'list_conflicts', 'generate_custom_skill',
      'list_generated_skills', 'run_swarm', 'get_swarm_run', 'synthesize_claude_md',
      'ingest_manual_document', 'save_pipeline', 'run_pipeline', 'list_pipeline_nodes',
      'get_pipeline', 'query_knowledge', 'reset_bridge',
    ];
    if (reserved.includes(spec.name)) {
      throw new Error(`"${spec.name}" is a built-in tool name. Choose a different skill name.`);
    }

    // Compile first: a syntax error must fail before anything touches disk.
    this.runtime.compile(spec);

    if (dry_run) {
      return {
        generated: false,
        dryRun: true,
        valid: true,
        message: `Spec for "${spec.name}" compiles cleanly. Re-run with dry_run=false to mint it.`,
        preview: { name: spec.name, params: spec.params, description: spec.description },
      };
    }

    const sourceFile = this.runtime.writeSource(spec);
    const registeredLive = this.runtime.registerLive(spec);
    const entry = this.runtime.record(spec, sourceFile, registeredLive, 'swarm');

    const facts: KnowledgeFact[] = [
      {
        id: `skill:${spec.name}`,
        agent: 'skill-forge',
        category: 'skill',
        title: `Generated skill: ${spec.name}`,
        detail:
          `${spec.description}\n` +
          `Parameters: ${spec.params.length ? spec.params.map((p) => `${p.name}: ${p.type}${p.required ? '' : '?'}`).join(', ') : 'none'}.\n` +
          `Why it exists: ${spec.rationale || 'discovered during reconnaissance'}.`,
        evidence: [entry.sourceFile],
        weight: 5,
      },
    ];
    this.store.addFacts(facts);

    ctx.logger.info('Skill generated', { name: spec.name, registeredLive, sourceFile: entry.sourceFile });

    return {
      generated: true,
      registeredLive,
      skill: entry,
      sourceFile: entry.sourceFile,
      skills: this.store.all('skills'),
      message: registeredLive
        ? `"${spec.name}" is live now — call it directly, no restart needed.`
        : `"${spec.name}" was written to ${entry.sourceFile} and will register on the next server start.`,
    };
  }

  @Tool({
    name: 'list_generated_skills',
    title: 'List generated skills',
    description:
      'Returns the registry of skills the swarm has minted, with their parameters, the ' +
      'rationale for each, and the source file on disk. These are documented in the ' +
      'generated CLAUDE.md so the next agent knows they exist.',
    inputSchema: z.object({}),
    examples: { request: {}, response: { skillCount: 1, skills: [] } },
  })
  @Widget('skill-forge')
  async listGeneratedSkills() {
    const skills = this.store.all('skills');
    return {
      skillCount: skills.length,
      skillsRoot: this.workspace.rel(this.workspace.projectRoot, this.workspace.skillsRoot),
      generationEnabled: this.runtime.generationEnabled,
      skills,
    };
  }
}
