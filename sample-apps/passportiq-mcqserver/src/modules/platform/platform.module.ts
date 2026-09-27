/**
 * PlatformModule — the rest of the MCP surface.
 *
 * Tools are the loud part of an MCP server, but a client that can only call tools
 * has to discover everything by trial. This module supplies the other three
 * primitives:
 *
 *   RESOURCES  read-only context a client loads up front — the applicant pool,
 *              the cited rulebook, the audit trail, the agent's traces
 *   PROMPTS    named officer workflows (briefing, ring memo, clarification letter)
 *              that encode HOW to ask, not just what is askable
 *   HEALTH     four checks that catch the failure modes a process-liveness probe
 *              cannot see — chiefly "the seed loaded but the fraud ring is gone"
 *
 * ---------------------------------------------------------------------------
 * WHY THESE LIVE IN THEIR OWN MODULE
 * ---------------------------------------------------------------------------
 * They read from every other module. Putting the rulebook resource inside
 * VerificationModule and the agent-trace resource inside AgentModule would work,
 * but it scatters the answer to "what can a client see?" across the codebase, and
 * the health checks genuinely span all three. One module that owns the
 * observability and discovery surface is easier to reason about than three
 * modules that each own a slice of it.
 *
 * ---------------------------------------------------------------------------
 * REGISTRATION MECHANICS THAT ARE EASY TO GET WRONG
 * ---------------------------------------------------------------------------
 *   @ResourceDecorator / @PromptDecorator methods are collected from classes in
 *   `controllers` (builders.buildController -> buildResources/buildPrompts). A
 *   resource class listed only in `providers` registers NOTHING and raises no
 *   error.
 *
 *   @HealthCheck classes are the opposite: they must be in `providers`, where
 *   app-decorator resolves them and calls registerHealthCheck (app-decorator.js:
 *   89-97). A health check listed in `controllers` contributes no tools, no
 *   resources and no checks.
 *
 * Both are silent failures, which is why they are written down here.
 */
import { Module } from '@nitrostack/core';
import { AgentModule } from '../agent/agent.module.js';
import { PipelineModule } from '../pipeline/pipeline.module.js';
import { VerificationModule } from '../verification/verification.module.js';
import {
  AgentActivityHealthCheck,
  LlmHealthCheck,
  RulebookHealthCheck,
  SeedDataHealthCheck,
} from './health/passportiq.health.js';
import { OfficerPrompts } from './prompts/officer.prompts.js';
import { PassportIqResources } from './resources/passportiq.resources.js';

@Module({
  name: 'platform',
  description:
    'PassportIQ MCP platform surface: read-only resources (applicant pool, cited rulebook, ' +
    'audit trail, agent reasoning traces), officer workflow prompts, and health checks that ' +
    'verify the seed data and fraud graph are intact.',
  // Resources and prompts are harvested from controllers.
  controllers: [PassportIqResources, OfficerPrompts],
  // Health checks are resolved and registered from providers.
  providers: [SeedDataHealthCheck, RulebookHealthCheck, LlmHealthCheck, AgentActivityHealthCheck],
  imports: [PipelineModule, VerificationModule, AgentModule],
})
export class PlatformModule {}
