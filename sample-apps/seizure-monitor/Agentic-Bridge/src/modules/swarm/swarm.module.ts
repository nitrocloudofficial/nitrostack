import { Module } from '@nitrostack/core';
import { SwarmTools } from './swarm.tools.js';
import { OrchestratorService } from './orchestrator.service.js';
import { CodebaseModule } from '../codebase/codebase.module.js';
import { DocumentationModule } from '../documentation/documentation.module.js';
import { QaModule } from '../qa/qa.module.js';
import { DevOpsModule } from '../devops/devops.module.js';
import { UiUxModule } from '../uiux/uiux.module.js';
import { AgileModule } from '../agile/agile.module.js';
import { ConflictModule } from '../conflict/conflict.module.js';
import { SynthesisModule } from '../synthesis/synthesis.module.js';

@Module({
  name: 'swarm',
  description:
    'Swarm orchestrator — dispatches all seven reconnaissance personas as real LLM agents ' +
    'and runs the master orchestrator to author the CLAUDE.md executive briefing.',
  imports: [
    CodebaseModule,
    DocumentationModule,
    QaModule,
    DevOpsModule,
    UiUxModule,
    AgileModule,
    ConflictModule,
    SynthesisModule,
  ],
  providers: [OrchestratorService],
  exports: [OrchestratorService],
  controllers: [SwarmTools],
})
export class SwarmModule {}
