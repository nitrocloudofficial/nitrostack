import { ControllerDecorator as Controller, ToolDecorator as Tool, Widget, Injectable, z, ExecutionContext } from '@nitrostack/core';
import { PatientRepository } from '../../repositories/patient.repository.js';
import { TrialRepository } from '../../repositories/trial.repository.js';
import { ClinicalTrialService } from '../../services/clinicaltrial.service.js';
import { EligibilityService, TrialEvaluationResult } from '../../services/eligibility.service.js';

/**
 * Input DTO interface for search_clinical_trials tool
 */
export interface SearchClinicalTrialsInput {
  patientId: string;
}

/**
 * Output DTO interface for search_clinical_trials tool
 */
export interface SearchClinicalTrialsOutput {
  success: boolean;
  patientId: string;
  disease: string;
  trials: TrialEvaluationResult[];
}

/**
 * Clinical Copilot MCP Server - Trials Tools
 *
 * Implements search_clinical_trials MCP Tool:
 * 1. Reads patient profile from MongoDB ('patients' collection)
 * 2. Queries live ClinicalTrials.gov API v2 for disease condition
 * 3. Evaluates eligibility using Gemini -> Grok -> RuleEngine fallback
 * 4. Ranks trials by eligibility score (Highest -> Lowest) and selects Top 5
 * 5. Saves trial search history to MongoDB ('trial_search_history' collection)
 * 6. Returns structured response payload
 */
@Controller()
@Injectable({ deps: [PatientRepository, TrialRepository, ClinicalTrialService, EligibilityService] })
export class TrialsTools {
  constructor(
    private readonly patientRepository: PatientRepository,
    private readonly trialRepository: TrialRepository,
    private readonly clinicalTrialService: ClinicalTrialService,
    private readonly eligibilityService: EligibilityService
  ) {}

  @Tool({
    name: 'search_clinical_trials',
    description: 'Searches live ClinicalTrials.gov API v2, compares patient medical profile using LLM eligibility reasoning (Gemini/Grok/RuleEngine), and returns top ranked trials.',
    inputSchema: z.object({
      patientId: z.string().describe('Target patient identifier (e.g. PAT001)'),
    }),
  })
  @Widget('TrialCard')
  async searchClinicalTrials(
    input: SearchClinicalTrialsInput,
    ctx: ExecutionContext
  ): Promise<SearchClinicalTrialsOutput> {
    ctx.logger.info(`Executing search_clinical_trials for patientId: ${input.patientId}`);

    // Step 1: Read Patient Profile from MongoDB ('patients' collection)
    const patient = await this.patientRepository.findById(input.patientId);

    if (!patient) {
      throw new Error(`Patient Not Found: Patient profile with ID '${input.patientId}' does not exist in MongoDB. Please register or upload a medical report first.`);
    }

    const disease = patient.disease || patient.diagnosis || 'Crohn Disease';

    // Step 2: Query Live ClinicalTrials.gov API v2
    ctx.logger.info(`Fetching live clinical trials for condition '${disease}'...`);
    const fetchedStudies = await this.clinicalTrialService.searchTrialsByDisease(disease, 10);

    // Step 3: Evaluate Eligibility via 3-Tier Pipeline (Gemini -> Grok -> RuleEngine)
    ctx.logger.info(`Evaluating trial eligibility scoring across ${fetchedStudies.length} study candidate(s)...`);
    const batchResult = await this.eligibilityService.evaluateEligibilityBatch(patient, fetchedStudies);

    // Step 4: Rank Trials by Eligibility Score (Highest -> Lowest) and select Top 5
    const rankedTrials = batchResult.evaluations
      .sort((a, b) => b.eligibilityScore - a.eligibilityScore)
      .slice(0, 5);

    // Step 5: Save Search History to MongoDB ('trial_search_history' collection)
    ctx.logger.info(`Persisting search history log into MongoDB ('trial_search_history')...`);
    await this.trialRepository.saveSearchHistory({
      patientId: input.patientId,
      searchedAt: new Date().toISOString(),
      disease,
      numberOfTrials: rankedTrials.length,
      selectedTrials: rankedTrials,
      llmUsed: batchResult.llmUsed,
    });

    // Step 6: Return Response Payload
    return {
      success: true,
      patientId: input.patientId,
      disease,
      trials: rankedTrials,
    };
  }
}
