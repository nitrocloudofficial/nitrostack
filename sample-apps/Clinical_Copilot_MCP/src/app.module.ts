import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { AuthModule } from './modules/auth/auth.module.js';
import { UploadModule } from './modules/upload/upload.module.js';
import { PatientModule } from './modules/patient/patient.module.js';
import { TimelineModule } from './modules/timeline/timeline.module.js';
import { TrialsModule } from './modules/trials/trials.module.js';
import { ReferralModule } from './modules/referral/referral.module.js';
import { SummarizePrompts } from './prompts/summarize.prompt.js';
import { EligibilityPrompts } from './prompts/eligibility.prompt.js';
import { ReferralPrompts } from './prompts/referral.prompt.js';
import { DiseaseResources } from './resources/disease.resource.js';
import { HospitalResources } from './resources/hospital.resource.js';
import { SystemHealthCheck } from './health/system.health.js';
import { MongoService } from './services/mongo.service.js';
import { HealthService } from './services/health.service.js';
import { PatientRepository } from './repositories/patient.repository.js';
import { UserRepository } from './repositories/user.repository.js';
import { ReportRepository } from './repositories/report.repository.js';
import { TimelineRepository } from './repositories/timeline.repository.js';
import { ReferralRepository } from './repositories/referral.repository.js';
import { TrialRepository } from './repositories/trial.repository.js';
import { ClinicalTrialService } from './services/clinicaltrial.service.js';
import { EligibilityService } from './services/eligibility.service.js';
import { ReferralService } from './services/referral.service.js';
import { PdfService } from './services/pdf.service.js';
import { SupabaseService } from './services/supabase.service.js';

/**
 * Clinical Copilot MCP Server - Root Application Module
 *
 * Bootstraps all feature modules, healthcare resources, prompt templates,
 * database repositories, and health check diagnostics for Clinical Copilot.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'clinical-copilot-mcp',
    version: '1.0.0',
  },
  logging: {
    level: 'info',
  },
})
@Module({
  name: 'app',
  description: 'Clinical Copilot MCP Server - An Agentic AI Healthcare Assistant powered by Model Context Protocol (MCP)',
  imports: [
    ConfigModule.forRoot(),
    AuthModule,
    UploadModule,
    PatientModule,
    TimelineModule,
    TrialsModule,
    ReferralModule,
  ],
  providers: [
    SystemHealthCheck,
    MongoService,
    HealthService,
    PatientRepository,
    UserRepository,
    ReportRepository,
    TimelineRepository,
    ReferralRepository,
    TrialRepository,
    ClinicalTrialService,
    EligibilityService,
    ReferralService,
    PdfService,
    SupabaseService,
    SummarizePrompts,
    EligibilityPrompts,
    ReferralPrompts,
    DiseaseResources,
    HospitalResources,
  ],
})
export class AppModule {}
