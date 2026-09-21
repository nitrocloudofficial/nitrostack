/**
 * ThreatMatrix MCP Tools Registry
 * All 28 security tools + process_request + investigate tool.
 * Uses @modelcontextprotocol/sdk directly with Zod input validation.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { container } from './container.js';
import { InvestigationOrchestrator } from './orchestrator.js';
import { logger } from './logger.js';

const services = container.threatAnalyzer;
const inputProcessor = container.inputProcessor;
const agentEngine = container.agentEngine;
const orchestrator = new InvestigationOrchestrator();

// ─── Zod Schemas ─────────────────────────────────────────────────────────────
const ProcessRequestSchema = z.object({ input: z.any(), context: z.string().optional() });
const UrlSchema = z.object({ url: z.string() });
const DomainSchema = z.object({ domain: z.string() });
const IpSchema = z.object({ ip: z.string() });
const HashSchema = z.object({ hash: z.string() });
const FilePathSchema = z.object({ filePath: z.string() });
const TextSchema = z.object({ text: z.string() });
const ContentSchema = z.object({ content: z.string() });
const RawTextSchema = z.object({ rawText: z.string() });
const HeadersSchema = z.object({ headers: z.string() });
const QrDataSchema = z.object({ qrData: z.string() });
const InputSchema = z.object({ input: z.string() });
const ImageInputSchema = z.object({ imageInput: z.string() });
const CorrelateSchema = z.object({ scannerOutputs: z.array(z.record(z.unknown())) });
const RiskScoreSchema = z.object({ scoreInput: z.number() });
const GenerateReportSchema = z.object({ scanId: z.string(), format: z.enum(['json', 'markdown', 'html', 'pdf']) });
const ScanIdSchema = z.object({ scanId: z.string() });
const LimitSchema = z.object({ limit: z.number().optional() });
const InvestigateSchema = z.object({ target: z.string(), type: z.enum(['url', 'email', 'file', 'ip', 'hash', 'auto']).optional() });

// ─── Tool Definitions ────────────────────────────────────────────────────────
const TOOL_DEFINITIONS = [
  {
    name: 'investigate',
    description: 'Run automated end-to-end multi-vector investigation workflow (URL, Email, PDF, File, IP, Hash) with report generation.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        target: { type: 'string', description: 'Target string, URL, file path, IP, or hash to investigate' },
        type: { type: 'string', enum: ['url', 'email', 'file', 'ip', 'hash', 'auto'], description: 'Investigation vector type' },
      },
      required: ['target'],
    },
  },
  {
    name: 'process_request',
    description: 'Process ANY user input (JSON, XML, CSV, Markdown, Code, Logs, PDF, URLs, Text, etc.) through the Universal Input Pipeline and Agentic AI reasoning engine.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        input: { description: 'Any user content, structured data, document path, or query to process' },
        context: { type: 'string', description: 'Optional additional context or task instructions' },
      },
      required: ['input'],
    },
  },
  {
    name: 'analyze_url',
    description: 'Analyze a URL for typosquatting, shorteners, raw IP host, high-risk TLDs, Google Safe Browsing and live DNS/WHOIS reputation.',
    inputSchema: {
      type: 'object' as const,
      properties: { url: { type: 'string', description: 'The URL to analyze (e.g. https://example.com)' } },
      required: ['url'],
    },
  },
  {
    name: 'expand_short_url',
    description: 'Unmask the real destination of a shortened URL by following HTTP redirects.',
    inputSchema: {
      type: 'object' as const,
      properties: { url: { type: 'string', description: 'Shortened URL to expand' } },
      required: ['url'],
    },
  },
  {
    name: 'check_domain',
    description: 'Check domain age, WHOIS registration, TLD reputation, and live DNS resolution.',
    inputSchema: {
      type: 'object' as const,
      properties: { domain: { type: 'string', description: 'Domain name to check (e.g. example.com)' } },
      required: ['domain'],
    },
  },
  {
    name: 'lookup_ip',
    description: 'Lookup an IP address for reputation, AbuseIPDB confidence score, ASN, PTR record, and private/public classification.',
    inputSchema: {
      type: 'object' as const,
      properties: { ip: { type: 'string', description: 'IPv4 address to look up' } },
      required: ['ip'],
    },
  },
  {
    name: 'lookup_hash',
    description: 'Check MD5, SHA-1, or SHA-256 file hash reputation in VirusTotal & threat intelligence feeds.',
    inputSchema: {
      type: 'object' as const,
      properties: { hash: { type: 'string', description: 'Hash string to look up' } },
      required: ['hash'],
    },
  },
  {
    name: 'analyze_pdf',
    description: 'Scan a PDF file binary stream for /JavaScript, /Launch, /OpenAction, and embedded malware objects.',
    inputSchema: {
      type: 'object' as const,
      properties: { filePath: { type: 'string', description: 'Absolute path to the PDF file to scan' } },
      required: ['filePath'],
    },
  },
  {
    name: 'extract_iocs',
    description: 'Extract all Indicators of Compromise (URLs, IPs, emails, crypto wallets) from raw text.',
    inputSchema: {
      type: 'object' as const,
      properties: { text: { type: 'string', description: 'Raw text to extract IoCs from' } },
      required: ['text'],
    },
  },
  {
    name: 'calculate_hash',
    description: 'Calculate MD5, SHA-1, and SHA-256 cryptographic hashes for a given string.',
    inputSchema: {
      type: 'object' as const,
      properties: { content: { type: 'string', description: 'Content to hash' } },
      required: ['content'],
    },
  },
  {
    name: 'analyze_email',
    description: 'Inspect raw email text for urgency coercion, BEC patterns, credential theft, and payment fraud.',
    inputSchema: {
      type: 'object' as const,
      properties: { rawText: { type: 'string', description: 'Full email body text to analyze' } },
      required: ['rawText'],
    },
  },
  {
    name: 'analyze_headers',
    description: 'Parse email headers to check SPF, DKIM, DMARC authentication status and relay hops.',
    inputSchema: {
      type: 'object' as const,
      properties: { headers: { type: 'string', description: 'Raw email headers string' } },
      required: ['headers'],
    },
  },
  {
    name: 'detect_phishing_language',
    description: 'Detect psychological pressure, urgency, fear, and social engineering language in text.',
    inputSchema: {
      type: 'object' as const,
      properties: { text: { type: 'string', description: 'Text to analyze for phishing language patterns' } },
      required: ['text'],
    },
  },
  {
    name: 'analyze_qr',
    description: 'Decode a QR code payload and analyze the embedded link for quishing risk.',
    inputSchema: {
      type: 'object' as const,
      properties: { qrData: { type: 'string', description: 'Decoded QR code data string' } },
      required: ['qrData'],
    },
  },
  {
    name: 'decode_qr',
    description: 'Extract raw payload string from a QR code image (base64 or path).',
    inputSchema: {
      type: 'object' as const,
      properties: { input: { type: 'string', description: 'QR code image as base64 string or file path' } },
      required: ['input'],
    },
  },
  {
    name: 'analyze_image_text',
    description: 'Extract and analyze OCR text and embedded URLs from screenshot images using AI vision.',
    inputSchema: {
      type: 'object' as const,
      properties: { imageInput: { type: 'string', description: 'OCR-extracted text from screenshot or image path' } },
      required: ['imageInput'],
    },
  },
  {
    name: 'correlate_findings',
    description: 'Correlate findings from multiple scanner outputs into a unified risk score.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        scannerOutputs: {
          type: 'array',
          description: 'Array of scan result objects to correlate',
          items: { type: 'object' },
        },
      },
      required: ['scannerOutputs'],
    },
  },
  {
    name: 'generate_risk_score',
    description: 'Assign a risk score (0-100) and classify it as SAFE, SUSPICIOUS, HIGH, or CRITICAL.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        scoreInput: { type: 'number', description: 'Raw numeric score to normalize and classify (0-100)' },
      },
      required: ['scoreInput'],
    },
  },
  {
    name: 'generate_report',
    description: 'Generate a threat analysis report in JSON, Markdown, HTML, or PDF format.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        scanId: { type: 'string', description: 'Scan audit ID to generate report for' },
        format: { type: 'string', enum: ['json', 'markdown', 'html', 'pdf'], description: 'Report output format' },
      },
      required: ['scanId', 'format'],
    },
  },
  {
    name: 'export_report',
    description: 'Export scan report data to persistent storage.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        reportData: { type: 'object', description: 'Report data object to export' },
      },
      required: ['reportData'],
    },
  },
  {
    name: 'save_scan',
    description: 'Save a scan audit record to the Postgres database via Prisma.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        scanData: { type: 'object', description: 'Scan result data to persist' },
      },
      required: ['scanData'],
    },
  },
  {
    name: 'get_scan_history',
    description: 'Retrieve scan audit history log from the database.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number', description: 'Maximum number of records to retrieve (default: 10)' },
      },
      required: [],
    },
  },
  {
    name: 'delete_scan',
    description: 'Delete a scan audit record by its ID.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        scanId: { type: 'string', description: 'UUID of the scan audit record to delete' },
      },
      required: ['scanId'],
    },
  },
  {
    name: 'health_check',
    description: 'Check operational health and uptime of the ThreatMatrix MCP Server.',
    inputSchema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'server_status',
    description: 'Get server status, version, active tools count, and capability summary.',
    inputSchema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'supported_formats',
    description: 'Enumerate all supported input file types and artifact formats.',
    inputSchema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'version',
    description: 'Return ThreatMatrix MCP Server version metadata.',
    inputSchema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'capabilities',
    description: 'Enumerate total tool, resource, and prompt capabilities of ThreatMatrix.',
    inputSchema: { type: 'object' as const, properties: {}, required: [] },
  },
];

// ─── Tool Executor ────────────────────────────────────────────────────────────
async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'investigate': {
      const parsed = InvestigateSchema.safeParse(args);
      if (!parsed.success) throw new McpError(ErrorCode.InvalidParams, parsed.error.message);
      return JSON.stringify(await orchestrator.investigate(parsed.data.target, parsed.data.type ?? 'auto'), null, 2);
    }

    case 'process_request': {
      const parsed = ProcessRequestSchema.safeParse(args);
      if (!parsed.success) throw new McpError(ErrorCode.InvalidParams, parsed.error.message);
      const inputStr = typeof parsed.data.input === 'string' ? parsed.data.input : JSON.stringify(parsed.data.input);
      const processed = await inputProcessor.process(inputStr);
      
      // Auto-extract embedded IoCs (URLs, IPs, Emails) from dataset / log inputs
      const iocScan = await services.extractIocs(processed.normalizedText);
      const agentResult = await agentEngine.processAgenticTask(processed, parsed.data.context);
      
      // Merge extracted IoC findings with agentic findings
      const mergedFindings = [...(agentResult.findings || [])];
      if (iocScan.findings && iocScan.findings.length > 0) {
        for (const iocFinding of iocScan.findings) {
          if (!mergedFindings.some(f => f.description === iocFinding.description)) {
            mergedFindings.push(iocFinding);
          }
        }
      }

      // Elevate risk score if high-risk IoCs exist in dataset
      let finalRiskScore = agentResult.riskScore;
      const hasHighRiskIoc = mergedFindings.some(f => f.severity === 'HIGH' || f.severity === 'CRITICAL');
      if (hasHighRiskIoc && finalRiskScore < 55) {
        finalRiskScore = Math.max(finalRiskScore, iocScan.riskScore, 65);
      }

      const riskLevel = finalRiskScore >= 75 ? 'CRITICAL' : finalRiskScore >= 50 ? 'HIGH' : finalRiskScore >= 20 ? 'SUSPICIOUS' : 'SAFE';

      return JSON.stringify({
        success: agentResult.success,
        response: agentResult.response,
        reasoning_summary: agentResult.reasoningSummary,
        riskScore: finalRiskScore,
        riskLevel,
        findings: mergedFindings,
        recommendedActions: agentResult.recommendedActions,
        metadata: {
          model: agentResult.metadata.model,
          executionTimeMs: agentResult.metadata.executionTimeMs,
          detectedFormat: agentResult.metadata.detectedFormat,
          extractedIocsCount: iocScan.findings.length,
          timestamp: agentResult.metadata.timestamp,
        },
      }, null, 2);
    }

    case 'analyze_url': {
      const parsed = UrlSchema.safeParse(args);
      if (!parsed.success) throw new McpError(ErrorCode.InvalidParams, parsed.error.message);
      return JSON.stringify(await services.analyzeUrl(parsed.data.url), null, 2);
    }

    case 'expand_short_url': {
      const parsed = UrlSchema.safeParse(args);
      if (!parsed.success) throw new McpError(ErrorCode.InvalidParams, parsed.error.message);
      return JSON.stringify(await services.expandShortUrl(parsed.data.url), null, 2);
    }

    case 'check_domain': {
      const parsed = DomainSchema.safeParse(args);
      if (!parsed.success) throw new McpError(ErrorCode.InvalidParams, parsed.error.message);
      return JSON.stringify(await services.checkDomain(parsed.data.domain), null, 2);
    }

    case 'lookup_ip': {
      const parsed = IpSchema.safeParse(args);
      if (!parsed.success) throw new McpError(ErrorCode.InvalidParams, parsed.error.message);
      return JSON.stringify(await services.lookupIp(parsed.data.ip), null, 2);
    }

    case 'lookup_hash': {
      const parsed = HashSchema.safeParse(args);
      if (!parsed.success) throw new McpError(ErrorCode.InvalidParams, parsed.error.message);
      return JSON.stringify(await services.lookupHash(parsed.data.hash), null, 2);
    }

    case 'analyze_pdf': {
      const parsed = FilePathSchema.safeParse(args);
      if (!parsed.success) throw new McpError(ErrorCode.InvalidParams, parsed.error.message);
      return JSON.stringify(await services.analyzePdf(parsed.data.filePath), null, 2);
    }

    case 'extract_iocs': {
      const parsed = TextSchema.safeParse(args);
      if (!parsed.success) throw new McpError(ErrorCode.InvalidParams, parsed.error.message);
      return JSON.stringify(await services.extractIocs(parsed.data.text), null, 2);
    }

    case 'calculate_hash': {
      const parsed = ContentSchema.safeParse(args);
      if (!parsed.success) throw new McpError(ErrorCode.InvalidParams, parsed.error.message);
      return JSON.stringify(await services.calculateHash(parsed.data.content), null, 2);
    }

    case 'analyze_email': {
      const parsed = RawTextSchema.safeParse(args);
      if (!parsed.success) throw new McpError(ErrorCode.InvalidParams, parsed.error.message);
      return JSON.stringify(await services.analyzeEmail(parsed.data.rawText), null, 2);
    }

    case 'analyze_headers': {
      const parsed = HeadersSchema.safeParse(args);
      if (!parsed.success) throw new McpError(ErrorCode.InvalidParams, parsed.error.message);
      return JSON.stringify(await services.analyzeHeaders(parsed.data.headers), null, 2);
    }

    case 'detect_phishing_language': {
      const parsed = TextSchema.safeParse(args);
      if (!parsed.success) throw new McpError(ErrorCode.InvalidParams, parsed.error.message);
      return JSON.stringify(await services.detectPhishingLanguage(parsed.data.text), null, 2);
    }

    case 'analyze_qr': {
      const parsed = QrDataSchema.safeParse(args);
      if (!parsed.success) throw new McpError(ErrorCode.InvalidParams, parsed.error.message);
      return JSON.stringify(await services.analyzeQr(parsed.data.qrData), null, 2);
    }

    case 'decode_qr': {
      const parsed = InputSchema.safeParse(args);
      if (!parsed.success) throw new McpError(ErrorCode.InvalidParams, parsed.error.message);
      return JSON.stringify(await services.decodeQr(parsed.data.input), null, 2);
    }

    case 'analyze_image_text': {
      const parsed = ImageInputSchema.safeParse(args);
      if (!parsed.success) throw new McpError(ErrorCode.InvalidParams, parsed.error.message);
      return JSON.stringify(await services.analyzeImageText(parsed.data.imageInput), null, 2);
    }

    case 'correlate_findings': {
      const parsed = CorrelateSchema.safeParse(args);
      if (!parsed.success) throw new McpError(ErrorCode.InvalidParams, parsed.error.message);
      return JSON.stringify(await services.correlateFindings(parsed.data.scannerOutputs), null, 2);
    }

    case 'generate_risk_score': {
      const parsed = RiskScoreSchema.safeParse(args);
      if (!parsed.success) throw new McpError(ErrorCode.InvalidParams, parsed.error.message);
      return JSON.stringify(await services.generateRiskScore(parsed.data.scoreInput), null, 2);
    }

    case 'generate_report': {
      const parsed = GenerateReportSchema.safeParse(args);
      if (!parsed.success) throw new McpError(ErrorCode.InvalidParams, parsed.error.message);
      return JSON.stringify(await services.generateReport(parsed.data.scanId, parsed.data.format), null, 2);
    }

    case 'export_report':
      return JSON.stringify(await services.exportReport(args.reportData), null, 2);

    case 'save_scan':
      return JSON.stringify(await services.saveScan(args.scanData), null, 2);

    case 'get_scan_history': {
      const parsed = LimitSchema.safeParse(args);
      return JSON.stringify(await services.getScanHistory(parsed.success && parsed.data.limit ? parsed.data.limit : 10), null, 2);
    }

    case 'delete_scan': {
      const parsed = ScanIdSchema.safeParse(args);
      if (!parsed.success) throw new McpError(ErrorCode.InvalidParams, parsed.error.message);
      return JSON.stringify(await services.deleteScan(parsed.data.scanId), null, 2);
    }

    case 'health_check':
      return JSON.stringify(await services.healthCheck(), null, 2);

    case 'server_status':
      return JSON.stringify(await services.serverStatus(), null, 2);

    case 'supported_formats':
      return JSON.stringify(await services.supportedFormats(), null, 2);

    case 'version':
      return JSON.stringify(await services.version(), null, 2);

    case 'capabilities':
      return JSON.stringify(await services.capabilities(), null, 2);

    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }
}

// ─── Register handlers on Server ─────────────────────────────────────────────
export function registerTools(server: Server): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug('tools/list requested');
    return { tools: TOOL_DEFINITIONS };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const safeArgs = (args ?? {}) as Record<string, unknown>;

    logger.info('Tool executed', { tool: name, args: Object.keys(safeArgs) });

    try {
      const result = await executeTool(name, safeArgs);
      return {
        content: [{ type: 'text' as const, text: result }],
        isError: false,
      };
    } catch (err) {
      if (err instanceof McpError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Tool execution error', { tool: name, error: message });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ error: { code: -32000, message, tool: name } }) }],
        isError: true,
      };
    }
  });
}

export { TOOL_DEFINITIONS, executeTool };
