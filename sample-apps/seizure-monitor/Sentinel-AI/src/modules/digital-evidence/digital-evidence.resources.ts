import {
  ResourceDecorator as Resource,
  ControllerDecorator as Controller,
  ExecutionContext
} from '@nitrostack/core';

/**
 * Controller exposing Digital Evidence Integrity MCP Resources
 */
@Controller()
export class DigitalEvidenceResources {
  /**
   * Manifest of active digital evidence assets and integrity status.
   */
  @Resource({
    uri: 'evidence://manifest/active',
    name: 'Active Evidence Manifest',
    description:
      'Manifest of active digital evidence items undergoing integrity verification and monitoring',
    mimeType: 'application/json'
  })
  async getEvidenceManifest(uri: string, context: ExecutionContext) {
    context.logger?.info?.('Reading resource evidence://manifest/active', { uri });

    return {
      type: 'json' as const,
      data: {
        totalAssets: 42,
        activeCases: 7,
        integrityStatus: 'HEALTHY',
        lastUpdated: new Date().toISOString(),
        manifest: [
          {
            evidenceId: 'EVD-2026-8801',
            caseId: 'CASE-7712',
            type: 'IMAGE',
            status: 'VERIFIED',
            trustScore: 98.5,
            admissibilitySupportAssessment: 'STRONG_SUPPORT'
          },
          {
            evidenceId: 'EVD-2026-8802',
            caseId: 'CASE-7712',
            type: 'VIDEO',
            status: 'ANALYZING',
            trustScore: 84.0,
            admissibilitySupportAssessment: 'STRONG_SUPPORT'
          },
          {
            evidenceId: 'EVD-2026-8803',
            caseId: 'CASE-9041',
            type: 'AUDIO',
            status: 'FLAGGED',
            trustScore: 42.0,
            admissibilitySupportAssessment: 'NEEDS_EXPERT_REVIEW'
          }
        ]
      }
    };
  }

  /**
   * Forensic standards reference guidelines.
   */
  @Resource({
    uri: 'evidence://standards/nist-iso',
    name: 'Digital Forensic Standards Reference',
    description:
      'Reference guidelines for digital evidence handling and admissibility-support assessment',
    mimeType: 'application/json'
  })
  async getForensicStandards(uri: string, context: ExecutionContext) {
    context.logger?.info?.('Reading resource evidence://standards/nist-iso', { uri });

    return {
      type: 'json' as const,
      data: {
        standards: [
          {
            code: 'ISO/IEC 27037:2012',
            title:
              'Guidelines for identification, collection, acquisition and preservation of digital evidence'
          },
          {
            code: 'NIST SP 800-86',
            title:
              'Guide to Integrating Forensic Techniques into Incident Response'
          },
          {
            code: 'FRE Rule 902(11/14)',
            title:
              'Federal Rules of Evidence - Self-Authenticating Electronic Records Reference'
          }
        ],
        corePrinciples: [
          'Chain of Custody continuity and non-repudiation',
          'Cryptographic hashing at immediate acquisition point',
          'Non-destructive bitstream forensic copies',
          'Auditable and reproducible verification trails',
          'Forensic decision-support analysis without absolute automated legal guarantees'
        ]
      }
    };
  }

  /**
   * Standard JSON Schema definition for evidence metadata objects.
   */
  @Resource({
    uri: 'evidence://schemas/metadata-v1',
    name: 'Evidence Metadata Schema',
    description:
      'Standard JSON Schema definition for Sentinel AI digital evidence metadata objects',
    mimeType: 'application/json'
  })
  async getEvidenceSchema(uri: string, context: ExecutionContext) {
    context.logger?.info?.('Reading resource evidence://schemas/metadata-v1', { uri });

    return {
      type: 'json' as const,
      data: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        title: 'SentinelAIEvidenceMetadata',
        type: 'object',
        properties: {
          evidenceId: { type: 'string' },
          hash: { type: 'string', pattern: '^[a-fA-F0-9]{64}$' },
          fileSize: { type: 'integer' },
          exif: { type: 'object' },
          chainOfCustody: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                timestamp: { type: 'string' },
                handler: { type: 'string' },
                action: { type: 'string' }
              }
            }
          }
        },
        required: ['evidenceId']
      }
    };
  }
}
