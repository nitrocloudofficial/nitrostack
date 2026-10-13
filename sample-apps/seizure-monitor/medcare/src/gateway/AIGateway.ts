/**
 * AIGateway
 *
 * Internal service. Receives requests ONLY from SecureDataGateway.
 *
 * AIGateway must NEVER:
 *   - communicate directly with the database (no IDatabaseService reference)
 *   - perform authentication (no IAuthenticationService reference)
 *   - perform authorization (no IAuthorizationService reference)
 *   - decrypt or encrypt data (no IEncryptionService / IKeyManagementService reference)
 *   - store patient information (stateless — everything lives in the call stack)
 *   - receive Master Keys
 *
 * AIGateway only:
 *   - chooses the correct AI agent (via AIRouter)
 *   - forwards minimal, sanitized patient information (data minimization lives here)
 *   - collects the AI response
 *   - returns structured JSON
 */

import type { IAIRouter } from '../interfaces/gateway.interfaces.js';
import type { AIRequest, AIResponse, AITaskName } from '../types/gateway.types.js';
import { generateRequestId } from '../utils/idGenerator.js';
import type {
  DrugOriginInput,
  MedicineAnalysisInput
} from '../agents/MedicineAI.js';
import type { ReportSummaryInput } from '../agents/ReportAI.js';
import type { EmergencyAnalysisInput } from '../agents/EmergencyAI.js';

// ---------------------------------------------------------------------------
// Raw (pre-minimization) shapes the gateway hands to AIGateway. These may
// still carry fields an AI agent should never see (name, phone, address,
// insurance, etc). AIGateway strips them down before routing.
// ---------------------------------------------------------------------------

export interface RawMedicineAnalysisContext {
  patientRecord: {
    name: string;
    phone?: string;
    address?: string;
    insurance?: string;
    diagnosis?: string;
    geneConflicts: MedicineAnalysisInput['geneConflicts'];
    activeMedications: string[];
    allergies: Array<{ substance: string }>;
  };
  prescription: string;
  knownInteractions: MedicineAnalysisInput['knownInteractions'];
}

export interface RawDrugOriginContext extends DrugOriginInput {}

export interface RawReportSummaryContext extends ReportSummaryInput {
  patientName?: string; // stripped before reaching ReportAI
}

export interface RawEmergencyAnalysisContext extends EmergencyAnalysisInput {
  patientName?: string; // stripped before reaching EmergencyAI
}

export type RawAIContext =
  | { task: 'medicine-analysis'; context: RawMedicineAnalysisContext }
  | { task: 'drug-origin'; context: RawDrugOriginContext }
  | { task: 'report-summary'; context: RawReportSummaryContext }
  | { task: 'emergency-analysis'; context: RawEmergencyAnalysisContext };

export class AIGateway {
  constructor(private readonly router: IAIRouter) {}

  async process(raw: RawAIContext): Promise<AIResponse> {
    const request = this.minimize(raw);
    return this.router.route(request);
  }

  /**
   * Data minimization: strips PII (name, phone, address, insurance, etc.)
   * and any other field not strictly needed by the target AI agent.
   *
   * Example from the spec, applied literally:
   *   { name, phone, address, diagnosis, prescription, insurance }
   *     -> { diagnosis, prescription }
   */
  private minimize(raw: RawAIContext): AIRequest {
    const requestId = generateRequestId();

    switch (raw.task) {
      case 'medicine-analysis': {
        const { patientRecord, prescription, knownInteractions } = raw.context;
        const input: MedicineAnalysisInput = {
          diagnosis: patientRecord.diagnosis,
          prescription,
          geneConflicts: patientRecord.geneConflicts,
          activeMedications: patientRecord.activeMedications,
          knownInteractions,
          hasDocumentedAllergy: patientRecord.allergies.some(a =>
            a.substance.toLowerCase().includes(prescription.toLowerCase())
          )
        };
        return { task: 'medicine-analysis', input: input as unknown as Record<string, unknown>, requestId };
      }

      case 'drug-origin': {
        const { drugName, ndcResolved, manufacturer, recallFound, counterfeitBatchMatch } = raw.context;
        const input: DrugOriginInput = { drugName, ndcResolved, manufacturer, recallFound, counterfeitBatchMatch };
        return { task: 'drug-origin', input: input as unknown as Record<string, unknown>, requestId };
      }

      case 'report-summary': {
        const { reportText, labHistory } = raw.context;
        const input: ReportSummaryInput = { reportText, labHistory };
        return { task: 'report-summary', input: input as unknown as Record<string, unknown>, requestId };
      }

      case 'emergency-analysis': {
        const {
          bloodType,
          criticalAllergies,
          criticalConditions,
          activeMedicationNames,
          geneticAlerts
        } = raw.context;
        const input: EmergencyAnalysisInput = {
          bloodType,
          criticalAllergies,
          criticalConditions,
          activeMedicationNames,
          geneticAlerts
        };
        return { task: 'emergency-analysis', input: input as unknown as Record<string, unknown>, requestId };
      }

      default: {
        const exhaustiveCheck: never = raw;
        throw new Error(`AIGateway: unhandled task shape: ${JSON.stringify(exhaustiveCheck)}`);
      }
    }
  }
}

/** Type guard used by SecureDataGateway to confirm a task name is one AIGateway understands. */
export function isKnownAITask(task: string): task is AITaskName {
  return ['medicine-analysis', 'report-summary', 'emergency-analysis', 'drug-origin'].includes(task);
}
