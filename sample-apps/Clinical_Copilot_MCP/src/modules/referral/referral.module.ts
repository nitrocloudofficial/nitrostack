import { Module } from '@nitrostack/core';
import { ReferralTools } from './referral.tools.js';
import { ReferralService } from '../../services/referral.service.js';
import { PdfService } from '../../services/pdf.service.js';
import { SupabaseService } from '../../services/supabase.service.js';
import { ClinicalTrialService } from '../../services/clinicaltrial.service.js';
import { PatientRepository } from '../../repositories/patient.repository.js';
import { ReportRepository } from '../../repositories/report.repository.js';
import { ReferralRepository } from '../../repositories/referral.repository.js';
import { MongoService } from '../../services/mongo.service.js';

/**
 * Clinical Copilot MCP Server - Referral Module
 */
@Module({
  name: 'referral',
  description: 'Specialist referral generation and hospital directory matching module',
  controllers: [ReferralTools],
  providers: [
    ReferralService,
    PdfService,
    SupabaseService,
    ClinicalTrialService,
    PatientRepository,
    ReportRepository,
    ReferralRepository,
    MongoService,
  ],
  exports: [ReferralTools, ReferralService],
})
export class ReferralModule {}
