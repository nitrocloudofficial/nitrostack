/**
 * ThreatMatrix MCP Prompts
 * 16 security prompts registered with proper MCP SDK handlers.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';

const PROMPTS = [
  {
    name: 'security_audit',
    description: 'Perform a comprehensive security audit on provided system inputs or architecture.',
    arguments: [{ name: 'input', description: 'System or code content to audit', required: true }],
  },
  {
    name: 'malware_analysis',
    description: 'Scan binary streams, code, or PDF files for malware payloads and obfuscated actions.',
    arguments: [{ name: 'target', description: 'File path or payload string', required: true }],
  },
  {
    name: 'phishing_analysis',
    description: 'Audit email or web content for linguistic coercion, BEC, and brand impersonation.',
    arguments: [{ name: 'content', description: 'Text or URL content to analyze', required: true }],
  },
  {
    name: 'incident_response',
    description: 'Generate incident containment strategies and immediate mitigation playbooks.',
    arguments: [{ name: 'incidentData', description: 'Incident log or alert data', required: true }],
  },
  {
    name: 'executive_report',
    description: 'Generate a board-level security briefing with risk score and business impact.',
    arguments: [{ name: 'scanResult', description: 'Full scan result JSON', required: true }],
  },
  {
    name: 'vulnerability_assessment',
    description: 'Evaluate system vulnerability exposure and assign risk levels.',
    arguments: [{ name: 'targetData', description: 'System or host metadata', required: true }],
  },
  {
    name: 'forensic_analysis',
    description: 'Extract and analyze IoCs (URLs, IPs, hashes, crypto wallets) from digital evidence.',
    arguments: [{ name: 'evidenceText', description: 'Raw evidence text to inspect', required: true }],
  },
  {
    name: 'risk_assessment',
    description: 'Perform holistic risk assessment and assign normalized risk scoring.',
    arguments: [{ name: 'findings', description: 'JSON findings to evaluate', required: true }],
  },
  {
    name: 'analyze_url_prompt',
    description: 'System prompt for URL threat analysis — typosquatting, shorteners, and IP host risks.',
    arguments: [{ name: 'url', description: 'URL to analyze', required: true }],
  },
  {
    name: 'analyze_pdf_prompt',
    description: 'System prompt for PDF malware stream scanning — /JavaScript, /Launch, /OpenAction detection.',
    arguments: [{ name: 'filePath', description: 'Path to the PDF file', required: true }],
  },
  {
    name: 'analyze_email_prompt',
    description: 'System prompt for email phishing audit — urgency coercion, payment demands, deceptive links.',
    arguments: [{ name: 'emailText', description: 'Email body text', required: true }],
  },
  {
    name: 'analyze_qr_prompt',
    description: 'System prompt for QR quishing analysis — decode QR and assess target URL reputation.',
    arguments: [{ name: 'qrData', description: 'QR code payload string', required: true }],
  },
  {
    name: 'analyze_image_prompt',
    description: 'System prompt for screenshot image OCR text security analysis.',
    arguments: [{ name: 'imageText', description: 'OCR-extracted text from image', required: true }],
  },
  {
    name: 'explain_threat_prompt',
    description: 'System prompt to explain security threat findings in professional cybersecurity terms.',
    arguments: [{ name: 'findings', description: 'JSON threat findings to explain', required: true }],
  },
  {
    name: 'generate_executive_report_prompt',
    description: 'System prompt for C-level executive threat summary with risk score, IoCs, and actions.',
    arguments: [{ name: 'scanResult', description: 'Full scan result JSON', required: true }],
  },
  {
    name: 'explain_non_technical_prompt',
    description: 'System prompt to explain threats in simple, non-technical language for end users.',
    arguments: [{ name: 'findings', description: 'Threat findings to simplify', required: true }],
  },
];

const PROMPT_TEMPLATES: Record<string, (args: Record<string, string>) => string> = {
  security_audit: (args) => `Perform a comprehensive security audit on this input:\n\n${args.input || '[input missing]'}`,
  malware_analysis: (args) => `Perform malware analysis on this target file or payload:\n\n${args.target || '[target missing]'}`,
  phishing_analysis: (args) => `Perform phishing and BEC analysis on this content:\n\n${args.content || '[content missing]'}`,
  incident_response: (args) => `Generate an incident response playbook for this alert:\n\n${args.incidentData || '[incident data missing]'}`,
  executive_report: (args) => `Generate an executive board summary from these scan results:\n\n${args.scanResult || '[scan result missing]'}`,
  vulnerability_assessment: (args) => `Evaluate security vulnerabilities for this system:\n\n${args.targetData || '[target data missing]'}`,
  forensic_analysis: (args) => `Perform forensic analysis and extract all IoCs from this evidence:\n\n${args.evidenceText || '[evidence missing]'}`,
  risk_assessment: (args) => `Evaluate risk scoring and assign normalized risk levels for these findings:\n\n${args.findings || '[findings missing]'}`,
  analyze_url_prompt: (args) => `Analyze URL for typosquatting, DNS resolution, and TLD reputation:\n\nURL: ${args.url || '[url missing]'}`,
  analyze_pdf_prompt: (args) => `Scan PDF file for embedded /JavaScript or /Launch streams:\n\nFile: ${args.filePath || '[file missing]'}`,
  analyze_email_prompt: (args) => `Audit email text for urgency coercion and credential harvesting:\n\n${args.emailText || '[email missing]'}`,
  analyze_qr_prompt: (args) => `Analyze QR quishing payload:\n\nData: ${args.qrData || '[qr missing]'}`,
  analyze_image_prompt: (args) => `Analyze OCR text from screenshot:\n\n${args.imageText || '[image text missing]'}`,
  explain_threat_prompt: (args) => `Explain threat findings in non-technical terms:\n\n${args.findings || '[findings missing]'}`,
  generate_executive_report_prompt: (args) => `Generate executive report:\n\n${args.scanResult || '[scan result missing]'}`,
  explain_non_technical_prompt: (args) => `Explain security findings simply for end users:\n\n${args.findings || '[findings missing]'}`,
};

export function registerPrompts(server: Server): void {
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    logger.debug('prompts/list requested');
    return { prompts: PROMPTS };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    logger.info('Prompt requested', { name });

    const templateFn = PROMPT_TEMPLATES[name];
    if (!templateFn) {
      throw new McpError(ErrorCode.InvalidRequest, `Prompt not found: ${name}`);
    }

    const safeArgs = (args ?? {}) as Record<string, string>;
    const text = templateFn(safeArgs);

    return {
      description: PROMPTS.find(p => p.name === name)?.description,
      messages: [{ role: 'user' as const, content: { type: 'text' as const, text } }],
    };
  });
}
