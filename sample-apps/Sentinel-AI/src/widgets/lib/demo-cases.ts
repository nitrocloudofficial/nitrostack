/**
 * SENTINEL AI DEMO CASE FIXTURES
 *
 * ⚠️  SAMPLE / DEMONSTRATION DATA ONLY  ⚠️
 * These fixtures are intentionally separate from the production analysis pipeline.
 * They populate intake form fields that are passed into real MCP tools.
 * They do NOT hard-code findings into the analysis pathway.
 *
 * Scenario: CCTV footage submitted after a commercial premises break-in incident.
 * Intentional suspicious indicator: reference hash does NOT match the computed hash
 * (simulating potential footage tampering before submission), and chain of custody
 * has a gap indicating the file was stored on an unverified external device.
 */

export interface ChainOfCustodyEntry {
  timestamp: string;
  handler: string;
  action: string;
}

export interface DemoCase {
  label: string;
  description: string;
  caseId: string;
  evidenceId: string;
  evidenceType: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'SYSTEM_LOG' | 'DISK_IMAGE';
  filename: string;
  fileType: string;
  /** Pre-computed hash from original acquisition (will intentionally NOT match to trigger a suspicious finding) */
  expectedHash: string;
  /** Hash of the submitted file (deliberately different to simulate possible tampering) */
  submittedHash: string;
  /** Digital signature — intentionally marked as invalid to trigger signature alert */
  signature: string;
  timestamp: string;
  chainOfCustody: ChainOfCustodyEntry[];
  investigatorId: string;
  organization: string;
  notes: string;
  /** Human-readable explanation of the suspicious indicators for demo display */
  suspiciousIndicators: string[];
}

/** The CCTV incident demonstration case */
export const DEMO_CASE_CCTV: DemoCase = {
  label: 'CCTV Incident — Premises Break-In',
  description:
    'CCTV footage from a commercial premises submitted 72 hours after a reported break-in. ' +
    'The original acquisition hash does NOT match the submitted file hash, and the chain of custody ' +
    'contains a 58-hour gap indicating the recording was held on an unverified external device before submission.',
  caseId: 'CASE-2026-CCTV-881',
  evidenceId: 'EVD-2026-CCTV-04',
  evidenceType: 'VIDEO',
  filename: 'exterior_camera_04_nightmode.mp4',
  fileType: 'video/mp4',
  // The original hash recorded at acquisition (reference)
  expectedHash: 'a3f8e1b2c94d57e6f0128abc3de45f67890ab1c2d3e4f5678901234567890abc',
  // The hash of the file actually submitted — intentionally differs to trigger MISMATCH
  submittedHash: 'c7d92e4f1a8b35069d21f4e7a830bc19eef56d78901a23b45678cd90ef012345',
  // Signature value containing "invalid" substring to trigger signature alert
  signature: 'SIG-INVALID-BREAK-IN-SCENE-04-EXT',
  timestamp: '2026-07-29T02:15:33Z',
  chainOfCustody: [
    {
      timestamp: '2026-07-29T02:17:00Z',
      handler: 'Responding Officer ID: PD-8812',
      action: 'Original CCTV footage acquired at scene and hash recorded'
    },
    {
      timestamp: '2026-07-29T02:20:00Z',
      handler: 'Responding Officer ID: PD-8812',
      action: 'Evidence transferred to investigation vehicle'
    },
    // 58-hour gap in chain of custody — suspicious
    {
      timestamp: '2026-07-31T12:45:00Z',
      handler: 'Detective ID: DT-2241',
      action: 'File received from external USB device and submitted to digital evidence unit'
    },
    {
      timestamp: '2026-07-31T13:30:00Z',
      handler: 'Digital Evidence Unit',
      action: 'Evidence ingested to Sentinel AI platform for forensic analysis'
    }
  ],
  investigatorId: 'DT-2241 (Detective J. Mercer)',
  organization: 'Metropolitan Digital Forensics Unit',
  notes:
    'Footage submitted from external USB device 72 hours after original acquisition. ' +
    'Hash mismatch detected on submission. Requesting full forensic integrity audit ' +
    'and manipulation scan to determine if footage has been altered prior to submission.',
  suspiciousIndicators: [
    'SHA-256 hash of submitted file does not match the hash recorded at acquisition — possible tampering',
    'Chain of custody has a 58-hour gap with no documented custody change',
    'Digital signature is invalid or absent — PKI verification not possible'
  ]
};

/** All available demo cases */
export const DEMO_CASES = [DEMO_CASE_CCTV];

/** Build the extractMetadata args from a demo case */
export function demoToExtractMetadataArgs(demo: DemoCase): Record<string, unknown> {
  return {
    evidenceId: demo.evidenceId,
    fileType: demo.fileType,
    evidenceType: demo.evidenceType,
    deepScan: true,
    hash: demo.submittedHash,
    expectedHash: demo.expectedHash,
    timestamp: demo.timestamp
  };
}

/** Build the verifyEvidence args from a demo case */
export function demoToVerifyEvidenceArgs(demo: DemoCase): Record<string, unknown> {
  return {
    evidenceId: demo.evidenceId,
    evidenceType: demo.evidenceType,
    hash: demo.submittedHash,
    expectedHash: demo.expectedHash,
    signature: demo.signature,
    timestamp: demo.timestamp,
    chainOfCustody: demo.chainOfCustody
  };
}

/** Build the detectManipulation args from a demo case */
export function demoToDetectManipulationArgs(demo: DemoCase): Record<string, unknown> {
  return {
    evidenceId: demo.evidenceId,
    analysisTypes: [
      'ELA_COMPRESSION',
      'DEEPFAKE_SYNTHETIC',
      'METADATA_INCONSISTENCY',
      'SPLICE_DETECTION'
    ],
    sensitivity: 'HIGH'
  };
}
