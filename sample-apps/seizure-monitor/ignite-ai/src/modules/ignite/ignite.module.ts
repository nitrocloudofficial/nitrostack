import { Module } from '@nitrostack/core';
import { IgniteTools } from './ignite.tools.js';
import { IgniteAnalyzerService } from './ignite-analyzer.service.js';
import { ChatService } from './chat.service.js';
import { AgentOrchestratorService } from './agent-orchestrator.service.js';

@Module({
  name: 'ignite',
  description: 'IGNITE AI - Your AI Startup Co-Founder for venture intelligence and startup analysis',
  controllers: [IgniteTools],
  providers: [IgniteAnalyzerService, ChatService, AgentOrchestratorService]
})
export class IgniteModule {}
