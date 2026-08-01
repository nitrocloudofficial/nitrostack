import { McpApp, Module, ConfigModule } from '@nitrostack/core';

import { DatabaseModule }     from './modules/database/database.module.js';
import { TargetModelModule }  from './modules/target-model/target-model.module.js';
import { AuditModule }        from './modules/audit/audit.module.js';
import { JudgesModule }       from './modules/judges/judges.module.js';
import { OrchestratorModule } from './modules/orchestrator/orchestrator.module.js';
import { AuthModule }         from './modules/auth/auth.module.js';
import { ProvenanceModule }   from './modules/provenance/provenance.module.js';

/**
 * Root Application Module — Provenance-Guarded Red-Team Harness
 *
 * Workstream mapping:
 *   Person A → TargetModelModule  (Ollama round-trip, MCP tools v1/v2)
 *   Person B → AuditModule        (SHA-256 hash-chain, NLI scope guard, sessions)
 *   Person C → JudgesModule       (LLM judge + pattern judge, calibration corpus)
 *   Person D → OrchestratorModule (full attack loop, MCP tools, React widget)
 */
@McpApp({
  module: AppModule,
  server: {
    name:    'provenance-guarded-redteam',
    version: '1.0.0',
  },
  transport: {
    type: 'dual',
    http: { port: 3000 },
  },
  logging: { level: 'info' },
})
@Module({
  name: 'app',
  description: 'Provenance-Guarded Red-Team Harness — fully merged (A+B+C+D)',
  imports: [
    ConfigModule.forRoot(),
    DatabaseModule,       // MongoDB (shared by AuditModule)
    TargetModelModule,    // Person A
    AuditModule,        // Person B — Provenance guard / Tamper-evident logging
    ProvenanceModule,   // Person B — Provenance MCP tools (anchor_intent, check_params)
    JudgesModule,       // Person C — Dual-judge evaluation
    OrchestratorModule, // Person D — Attack loop orchestration
    AuthModule,         // Database user authentication module
  ],
})
export class AppModule {}
