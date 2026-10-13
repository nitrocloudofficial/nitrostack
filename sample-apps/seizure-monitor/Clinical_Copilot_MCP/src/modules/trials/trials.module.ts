import { Module } from '@nitrostack/core';
import { TrialsTools } from './trials.tools.js';
import { ClinicalTrialService } from '../../services/clinicaltrial.service.js';
import { EligibilityService } from '../../services/eligibility.service.js';
import { PatientRepository } from '../../repositories/patient.repository.js';
import { TrialRepository } from '../../repositories/trial.repository.js';
import { MongoService } from '../../services/mongo.service.js';

/**
 * Clinical Copilot MCP Server - Trials Module
 */
@Module({
  name: 'trials',
  description: 'Clinical trial matching, recruitment search, and eligibility scoring module',
  controllers: [TrialsTools],
  providers: [
    PatientRepository,
    TrialRepository,
    ClinicalTrialService,
    EligibilityService,
    MongoService,
  ],
  exports: [TrialsTools, ClinicalTrialService, EligibilityService],
})
export class TrialsModule {}
