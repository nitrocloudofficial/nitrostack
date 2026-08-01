import { Module } from '@nitrostack/core';
import { SharedModule } from '../../shared/shared.module.js';
import { PlannerAgent } from './planner.agent.js';
import { ExecutorAgent } from './executor.agent.js';
import { ReviewerAgent } from './reviewer.agent.js';
import { DebuggerAgent } from './debugger.agent.js';
import { AgentTools } from './agent.tools.js';

/**
 * AI Agents Module
 *
 * Provides specialized engineering agents for planning, code generation, code review, and debugging.
 */
@Module({
  name: 'agents',
  description: 'Specialized AI engineering agents module',
  imports: [SharedModule],
  providers: [PlannerAgent, ExecutorAgent, ReviewerAgent, DebuggerAgent],
  controllers: [AgentTools],
  exports: [PlannerAgent, ExecutorAgent, ReviewerAgent, DebuggerAgent],
})
export class AgentsModule {}
