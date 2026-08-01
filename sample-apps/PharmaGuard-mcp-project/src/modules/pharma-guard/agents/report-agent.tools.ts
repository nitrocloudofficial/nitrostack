/**
 * 📊 Report Agent
 * Responsible for aggregating all safety check results into a final
 * risk assessment and generating a professional clinical report
 * with the Risk Dashboard widget.
 * 
 * Tools: aggregate_risk_score, generate_doctor_report
 */
import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import { callGemini } from '../shared-utils.js';

export class ReportAgent {

  // ==========================================================================
  // aggregate_risk_score
  // ==========================================================================
  @Tool({
    name: 'aggregate_risk_score',
    description: 'Combines all individual safety check results into one overall risk assessment with a clear verdict (safe / caution / high_risk)',
    inputSchema: z.object({
      checks: z.array(z.object({
        type: z.string().describe('Type of check (e.g. drug_interaction, allergy, disease, age, renal, pregnancy, duplicate, ayush)'),
        flagged: z.boolean().describe('Whether this check raised a concern'),
        severity: z.string().optional().describe('Severity level: minor, moderate, major'),
        detail: z.string().optional().describe('Description of the concern'),
        citation: z.string().optional().describe('Source citation for this finding'),
      })).describe('Array of all individual check results')
    }),
    examples: {
      request: {
        checks: [
          { type: 'drug_interaction', flagged: true, severity: 'major', detail: 'NSAIDs + ACE inhibitors', citation: 'OpenFDA Drug Label Database' },
          { type: 'allergy', flagged: false },
          { type: 'age', flagged: true, severity: 'moderate', detail: 'Elderly patient, 65+', citation: 'AGS Beers Criteria' },
          { type: 'ayush', flagged: true, severity: 'moderate', detail: 'Ashwagandha × Metformin', citation: 'AYUSH Ministry Guidelines' }
        ]
      },
      response: {
        overallRisk: 'high_risk',
        riskScore: 3,
        totalChecks: 4,
        flaggedChecks: [
          { type: 'drug_interaction', severity: 'major', detail: 'NSAIDs + ACE inhibitors', citation: 'OpenFDA Drug Label Database' },
          { type: 'age', severity: 'moderate', detail: 'Elderly patient, 65+', citation: 'AGS Beers Criteria' },
          { type: 'ayush', severity: 'moderate', detail: 'Ashwagandha × Metformin', citation: 'AYUSH Ministry Guidelines' }
        ],
        recommendation: 'Multiple safety concerns identified. Review recommended before prescribing.'
      }
    }
  })
  @Widget('agent-trace')
  async aggregateRiskScore(
    input: { checks: Array<{ type: string; flagged: boolean; severity?: string; detail?: string; citation?: string }> },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Aggregating risk score', { totalChecks: input.checks.length });

    const flaggedChecks = input.checks.filter(c => c.flagged);
    const hasMajor = flaggedChecks.some(c => c.severity === 'major');

    let overallRisk: string;
    let recommendation: string;

    if (flaggedChecks.length === 0) {
      overallRisk = 'safe';
      recommendation = 'No safety concerns identified. Prescription appears safe to proceed.';
    } else if (hasMajor || flaggedChecks.length >= 2) {
      overallRisk = 'high_risk';
      recommendation = 'Multiple or major safety concerns identified. Strongly recommend reviewing alternatives before prescribing.';
    } else {
      overallRisk = 'caution';
      recommendation = 'Minor concern identified. Proceed with caution and consider dose adjustment.';
    }

    return {
      overallRisk,
      riskScore: flaggedChecks.length,
      totalChecks: input.checks.length,
      flaggedChecks,
      recommendation,
      // Pass ALL checks (not just flagged) for the Agent Trace widget
      _traceInput: input.checks,
    };
  }

  // ==========================================================================
  // generate_doctor_report (with Risk Dashboard Widget)
  // ==========================================================================
  @Tool({
    name: 'generate_doctor_report',
    description: 'Generates a clear, concise clinical safety report for the doctor summarizing all findings, concerns, source citations, and the final recommendation. Renders a Risk Dashboard widget.',
    inputSchema: z.object({
      patientName: z.string().describe('Patient full name'),
      patientId: z.string().describe('Patient ID'),
      proposedDrug: z.string().describe('The drug being proposed'),
      proposedDosage: z.string().optional().describe('Proposed dosage'),
      riskAssessment: z.object({
        overallRisk: z.string(),
        riskScore: z.number(),
        flaggedChecks: z.array(z.any())
      }).describe('Output from aggregate_risk_score'),
      recommendedAlternative: z.string().optional().describe('Suggested alternative drug if any')
    }),
    examples: {
      request: {
        patientName: 'Mr. Sharma',
        patientId: 'P001',
        proposedDrug: 'Ibuprofen',
        proposedDosage: '400mg',
        riskAssessment: {
          overallRisk: 'high_risk',
          riskScore: 2,
          flaggedChecks: [
            { type: 'drug_interaction', severity: 'major', detail: 'NSAIDs + ACE inhibitors', citation: 'OpenFDA Drug Label Database' }
          ]
        }
      },
      response: {
        report: 'Clinical safety report text with [Source] tags...'
      }
    }
  })
  @Widget('risk-dashboard')
  async generateDoctorReport(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating doctor report', {
      patient: input.patientName,
      drug: input.proposedDrug,
      risk: input.riskAssessment.overallRisk
    });

    const prompt = `You are a clinical decision support system. Write a concise, professional clinical safety report for a doctor.

PATIENT: ${input.patientName} (${input.patientId})
PROPOSED PRESCRIPTION: ${input.proposedDrug}${input.proposedDosage ? ' ' + input.proposedDosage : ''}
OVERALL RISK LEVEL: ${input.riskAssessment.overallRisk.toUpperCase()}
RISK SCORE: ${input.riskAssessment.riskScore} concern(s) flagged

SPECIFIC FINDINGS:
${JSON.stringify(input.riskAssessment.flaggedChecks, null, 2)}

${input.recommendedAlternative ? `SUGGESTED ALTERNATIVE: ${input.recommendedAlternative}` : ''}

Write the report with this structure:
1. **Overall Verdict** — one sentence: safe / proceed with caution / do not prescribe
2. **Concerns Found** — bullet list of each flagged issue with clinical context
3. For EACH concern, include a **[Source]** tag showing where the rule came from (e.g., [Source: OpenFDA Drug Label Database], [Source: AGS Beers Criteria], [Source: KDIGO Guidelines], [Source: AYUSH Herb-Drug Interaction Database])
4. **Recommendation** — what should the doctor do next

Be direct, clinical, evidence-based, and non-alarmist. Use professional medical terminology. Keep it under 300 words.`;

    let reportText = await callGemini(prompt);

    // Fallback: template-based report when LLM is unavailable
    if (!reportText) {
      ctx.logger.warn('Gemini unavailable, generating template-based report');
      const flagged = input.riskAssessment.flaggedChecks || [];
      const riskLabel = input.riskAssessment.overallRisk === 'high_risk' ? 'HIGH RISK — DO NOT PRESCRIBE without review'
        : input.riskAssessment.overallRisk === 'caution' ? 'CAUTION — Proceed with adjustments'
        : 'SAFE — No significant concerns identified';

      reportText = `**Overall Verdict:** ${riskLabel}

**Patient:** ${input.patientName} (${input.patientId})
**Proposed:** ${input.proposedDrug}${input.proposedDosage ? ' ' + input.proposedDosage : ''}
**Risk Score:** ${input.riskAssessment.riskScore} concern(s) flagged

**Concerns Found:**
${flagged.length > 0
  ? flagged.map((c: any) => `• [${(c.severity || 'info').toUpperCase()}] ${c.type}: ${c.detail || 'Flagged'} [Source: ${c.citation || 'PharmaGuard Clinical Database'}]`).join('\n')
  : '• None — all safety checks passed'}

**Recommendation:** ${input.riskAssessment.overallRisk === 'high_risk'
  ? `Review alternatives before prescribing. ${input.recommendedAlternative ? 'Consider ' + input.recommendedAlternative + ' as a safer option.' : 'Consult a pharmacist.'}`
  : input.riskAssessment.overallRisk === 'caution'
  ? 'Proceed with dose adjustment and close monitoring.'
  : 'Prescription appears safe to proceed at standard dosing.'}`;
    }

    return {
      report: reportText,
      metadata: {
        patient: input.patientName,
        proposedDrug: input.proposedDrug,
        overallRisk: input.riskAssessment.overallRisk,
        generatedAt: new Date().toISOString(),
      },
    };
  }
}
