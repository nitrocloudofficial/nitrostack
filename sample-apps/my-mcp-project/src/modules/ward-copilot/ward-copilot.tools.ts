import { ToolDecorator as Tool, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { WardCopilotService } from './ward-copilot.service.js';

const PatientIdSchema = z.object({
    patientId: z.string().describe('ID of the patient (e.g. PAT-001)'),
});

const ExplainFactorSchema = z.object({
    patientId: z.string().describe('ID of the patient (e.g. PAT-001)'),
    factor: z.string().describe('Clinical factor or condition to explain'),
});

@Injectable({ deps: [WardCopilotService] })
export class WardCopilotTools {
    constructor(private readonly wardCopilotService: WardCopilotService) { }

    @Tool({
        name: 'get_patient_summary',
        description: 'Fetch complete patient profile, admission info, active conditions, and medications from Ward Copilot backend',
        inputSchema: PatientIdSchema,
        examples: {
            request: { patientId: 'PAT-001' },
            response: {
                id: 'PAT-001',
                name: 'Eleanor Vance',
                age: 72,
                gender: 'Female',
                bed_number: 'Bed 04',
                unit: 'ICU-B',
                primary_diagnosis: 'Severe Sepsis secondary to Pneumonia',
                current_risk_score: 0.85,
                risk_level: 'High'
            }
        }
    })
    async getPatientSummary(args: z.infer<typeof PatientIdSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Fetching patient summary', { patientId: args.patientId });
        return await this.wardCopilotService.getPatientSummary(args.patientId);
    }

    @Tool({
        name: 'get_vitals_trend',
        description: 'Fetch 24-hour vitals telemetry series (pulse, blood pressure, temperature, respiration rate, SpO2) for a patient',
        inputSchema: PatientIdSchema,
        examples: {
            request: { patientId: 'PAT-001' },
            response: {
                patient_id: 'PAT-001',
                series: [
                    {
                        timestamp: '2026-07-25 08:00',
                        bp_systolic: 120.0,
                        bp_diastolic: 78.0,
                        pulse: 82.0,
                        temperature: 37.1,
                        respiration_rate: 16.0,
                        spo2: 98.0
                    }
                ]
            }
        }
    })
    async getVitalsTrend(args: z.infer<typeof PatientIdSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Fetching vitals trend telemetry', { patientId: args.patientId });
        return await this.wardCopilotService.getVitalsTrend(args.patientId);
    }

    @Tool({
        name: 'get_risk_factors',
        description: 'Fetch XGBoost clinical deterioration risk score and SHAP TreeExplainer feature attributions for a patient',
        inputSchema: PatientIdSchema,
        examples: {
            request: { patientId: 'PAT-001' },
            response: {
                patient_id: 'PAT-001',
                current_risk_score: 0.85,
                risk_level: 'High',
                top_features: [
                    { feature: 'Pulse Spike (+35 bpm)', shap_value: 0.38, impact: 'High Risk Driver' },
                    { feature: 'Lactate Marker (4.2 mmol/L)', shap_value: 0.28, impact: 'High Risk Driver' }
                ]
            }
        }
    })
    async getRiskFactors(args: z.infer<typeof PatientIdSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Fetching XGBoost risk factors & SHAP values', { patientId: args.patientId });
        return await this.wardCopilotService.getRiskFactors(args.patientId);
    }

    @Tool({
        name: 'find_similar_cases',
        description: 'Perform FAISS semantic vector search to find Top 5 clinically similar historical cohort patients with match explanations',
        inputSchema: PatientIdSchema,
        examples: {
            request: { patientId: 'PAT-001' },
            response: {
                patient_id: 'PAT-001',
                similar_cases: [
                    {
                        case_id: 'HIST-012',
                        similarity_percent: 96.4,
                        primary_diagnosis: 'Severe Sepsis secondary to Pneumonia',
                        outcome_summary: 'Vasopressor Support Initiated',
                        similarity_explanation: 'Matched on: Matching sepsis diagnosis, pulse trajectory, and lactate elevation'
                    }
                ]
            }
        }
    })
    async findSimilarCases(args: z.infer<typeof PatientIdSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Searching FAISS clinically similar cases', { patientId: args.patientId });
        return await this.wardCopilotService.findSimilarCases(args.patientId);
    }

    @Tool({
        name: 'explain_factor',
        description: 'Request grounded multi-agent clinical explanation for a specific risk factor or intervention requirement',
        inputSchema: ExplainFactorSchema,
        examples: {
            request: { patientId: 'PAT-001', factor: 'Why is patient high risk?' },
            response: {
                patient_id: 'PAT-001',
                risk_level: 'High',
                confidence_percent: 92.5,
                summary: 'Patient exhibits hemodynamic instability due to severe sepsis.'
            }
        }
    })
    async explainFactor(args: z.infer<typeof ExplainFactorSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Explaining clinical factor via multi-agent orchestrator', { patientId: args.patientId, factor: args.factor });
        return await this.wardCopilotService.explainFactor(args.patientId, args.factor);
    }
}
