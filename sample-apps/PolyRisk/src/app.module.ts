import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { VariantModule } from './modules/variant/variant.module.js';
import { EvidenceModule } from './modules/evidence/evidence.module.js';
import { ScoringModule } from './modules/scoring/scoring.module.js';
import { ReportModule } from './modules/report/report.module.js';
import { AnalysisModule } from './modules/analysis/analysis.module.js';
import { AgentModule } from './modules/agent/agent.module.js';
import { RiskInterpreterModule } from './modules/risk-interpreter/risk-interpreter.module.js';
import { CitationsModule } from './modules/citations/citations.module.js';
import { SystemHealthCheck } from './health/system.health.js';

@McpApp({
  module: AppModule,
  server: {
    name: 'polyrisk',
    version: '1.0.0',
  },
  logging: {
    level: 'info',
  },
})
@Module({
  name: 'app',
  description: 'PolyRisk — Transparent Polygenic Risk Score server backed by live GWAS Catalog and PubMed data',
  imports: [
    ConfigModule.forRoot(),
    VariantModule,
    EvidenceModule,
    ScoringModule,
    ReportModule,
    AnalysisModule,
    AgentModule,
    RiskInterpreterModule,
    CitationsModule,
  ],
  providers: [
    SystemHealthCheck,
  ],
})
export class AppModule {}
