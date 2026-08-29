import {
  PromptDecorator as Prompt,
  ControllerDecorator as Controller,
  ExecutionContext
} from '@nitrostack/core';

export interface PromptMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Controller exposing Digital Evidence Integrity MCP Prompts
 */
@Controller()
export class DigitalEvidencePrompts {
  /**
   * Prompt to guide investigators through initial evidence triage and verification workflow.
   */
  @Prompt({
    name: 'evidence-triage',
    title: 'Digital Evidence Intake Triage',
    description:
      'Structured prompt workflow for initial digital evidence intake, hash verification, and risk assessment',
    arguments: [
      {
        name: 'evidenceId',
        description: 'ID of the evidence item to triage',
        required: true
      },
      {
        name: 'evidenceType',
        description: 'Type of evidence (IMAGE, VIDEO, AUDIO, DOCUMENT)',
        required: false
      }
    ]
  })
  async evidenceTriage(
    args: Record<string, any>,
    context: ExecutionContext
  ): Promise<PromptMessage[]> {
    context.logger?.info?.('Executing prompt evidence-triage', { evidenceId: String(args?.evidenceId || '') });

    const evidenceId = String(args?.evidenceId || 'UNKNOWN');
    const evidenceType = String(args?.evidenceType || 'GENERAL');

    return [
      {
        role: 'system',
        content:
          'You are Sentinel AI Forensic Assistant, an expert in digital evidence triage, forensic decision-support, and chain of custody verification.'
      },
      {
        role: 'user',
        content: `Please guide the forensic triage for Evidence Item ID: ${evidenceId} (Type: ${evidenceType}).
Perform the following steps:
1. Verify the cryptographic hash (SHA-256) against the intake log using verifyEvidence.
2. Extract all embedded EXIF headers and metadata attributes using extractMetadata.
3. Check for signs of temporal or spatial modification using detectManipulation.
4. Calculate explainable trust score using calculateTrustScore.
5. Generate forensic decision-support report using generateForensicReport.`
      }
    ];
  }

  /**
   * Prompt to guide admissibility-support assessment review for digital evidence.
   */
  @Prompt({
    name: 'court-admissibility-review',
    title: 'Admissibility-Support Assessment Review',
    description:
      'Evaluates digital evidence integrity for forensic decision-support and admissibility-support assessment',
    arguments: [
      {
        name: 'evidenceId',
        description: 'ID of the evidence item',
        required: true
      },
      {
        name: 'jurisdiction',
        description: 'Target legal jurisdiction (e.g. US_FEDERAL, EU_GDPR, UK_PACE)',
        required: false
      }
    ]
  })
  async courtAdmissibilityReview(
    args: Record<string, any>,
    context: ExecutionContext
  ): Promise<PromptMessage[]> {
    context.logger?.info?.('Executing prompt court-admissibility-review', { evidenceId: String(args?.evidenceId || '') });

    const evidenceId = String(args?.evidenceId || 'UNKNOWN');
    const jurisdiction = String(args?.jurisdiction || 'US_FEDERAL');

    return [
      {
        role: 'system',
        content:
          'You are a Senior Digital Forensics Consultant specializing in electronic evidence analysis and admissibility-support assessment.'
      },
      {
        role: 'user',
        content: `Conduct an admissibility-support assessment for Evidence ID ${evidenceId} under ${jurisdiction} jurisdiction rules.
Evaluate:
1. Self-authentication capabilities via digital hash certificates.
2. Chain of custody continuity and audit log integrity.
3. Potential challenge vulnerabilities (e.g., deepfake or metadata alteration arguments).
4. Foundation requirements for forensic decision-support.`
      }
    ];
  }

  /**
   * Prompt to guide investigation of flagged synthetic/manipulated artifacts.
   */
  @Prompt({
    name: 'anomaly-investigation',
    title: 'Deepfake & Manipulation Investigation',
    description:
      'Detailed investigation plan for flagged anomalies, Error Level Analysis (ELA), and generative AI artifacts',
    arguments: [
      {
        name: 'evidenceId',
        description: 'ID of the flagged evidence item',
        required: true
      },
      {
        name: 'flaggedAnomalies',
        description: 'Comma-separated list of detected anomalies',
        required: true
      }
    ]
  })
  async anomalyInvestigation(
    args: Record<string, any>,
    context: ExecutionContext
  ): Promise<PromptMessage[]> {
    context.logger?.info?.('Executing prompt anomaly-investigation', { evidenceId: String(args?.evidenceId || '') });

    const evidenceId = String(args?.evidenceId || 'UNKNOWN');
    const flaggedAnomalies = String(args?.flaggedAnomalies || 'ELA_COMPRESSION_VARIANCE');

    return [
      {
        role: 'system',
        content:
          'You are Sentinel AI Lead Manipulation Analyst, specializing in computer vision forensics, generative AI deepfake detection, and audio-visual splicing analysis.'
      },
      {
        role: 'user',
        content: `Investigate the following flagged anomalies for Evidence ID ${evidenceId}:
Flagged Items: ${flaggedAnomalies}

Steps to follow:
1. Break down each detected anomaly and explain its technical root cause.
2. Differentiate between benign editing/compression vs malicious forgery.
3. Recommend targeted secondary forensic tools (e.g., frequency spectrum analysis, PRNU sensor noise matching).
4. Summarize confidence level in the tampering verdict.`
      }
    ];
  }
}
