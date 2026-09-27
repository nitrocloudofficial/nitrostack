import { Module } from '@nitrostack/core';
import { AgentTools } from './agent.tools.js';
import { AgentService } from './agent.service.js';

@Module({
  name: 'agent',
  description: 'Agentic AI pipeline — upload real 23andMe/AncestryDNA genetic data and get a Claude-powered personalized risk narrative with live GWAS and PubMed tool calls',
  controllers: [AgentTools],
  providers: [AgentService],
})
export class AgentModule {}
