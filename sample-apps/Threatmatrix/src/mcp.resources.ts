/**
 * ThreatMatrix MCP Resources
 * 6 resources registered with proper MCP SDK handlers.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';

const RESOURCES = [
  {
    uri: 'threatmatrix://docs',
    name: 'ThreatMatrix Documentation',
    description: 'Complete MCP Server guide and tool reference for NitroStack Marketplace.',
    mimeType: 'text/markdown',
  },
  {
    uri: 'threatmatrix://help',
    name: 'Help & Usage Guide',
    description: 'Usage instructions for all 27 ThreatMatrix security tools.',
    mimeType: 'text/markdown',
  },
  {
    uri: 'threatmatrix://examples',
    name: 'Sample Artifact Queries',
    description: 'Example payloads for URL, PDF, email, QR, and image analysis.',
    mimeType: 'application/json',
  },
  {
    uri: 'threatmatrix://threat-feed',
    name: 'Live Threat Intelligence Feed',
    description: 'Active threat campaign indicators and phishing vector data.',
    mimeType: 'application/json',
  },
  {
    uri: 'threatmatrix://recent-scans',
    name: 'Recent Scan Audits',
    description: 'Summary of recent scan audit records.',
    mimeType: 'application/json',
  },
  {
    uri: 'threatmatrix://policies',
    name: 'Security Risk Policies',
    description: 'Risk scoring thresholds and security classification policies.',
    mimeType: 'text/markdown',
  },
];

const RESOURCE_CONTENT: Record<string, string> = {
  'threatmatrix://docs': `# ThreatMatrix MCP Server Documentation

## Overview
ThreatMatrix is an enterprise-grade, AI-powered cybersecurity MCP server providing 27 specialized security analysis tools.

## Tools Available
- **process_request** — Universal Input Pipeline & Agentic AI Reasoning
- **analyze_url** — Live DNS, RDAP WHOIS, typosquatting detection
- **expand_short_url** — HTTP redirect chain expansion
- **check_domain** — Domain age and TLD reputation
- **lookup_ip** — IP reputation and PTR record lookup
- **lookup_hash** — File hash reputation (MD5/SHA256)
- **analyze_pdf** — PDF malware stream scanner
- **extract_iocs** — IoC extraction from raw text
- **calculate_hash** — Cryptographic hash computation
- **analyze_email** — BEC, phishing and urgency detection
- **analyze_headers** — SPF/DKIM/DMARC verification
- **detect_phishing_language** — Social engineering language detection
- **analyze_qr** — QR quishing risk analysis
- **analyze_image_text** — OCR + AI vision text security analysis
- **correlate_findings** — Multi-scanner result correlation
- **generate_risk_score** — 0-100 normalized risk classification
- **generate_report** — JSON/Markdown/HTML/PDF reports
- **save_scan / get_scan_history / delete_scan** — Audit trail management
- **health_check / server_status / capabilities** — Server introspection

## NitroStack Integration
This server is fully compatible with NitroStack Cloud Marketplace.
`,

  'threatmatrix://help': `# ThreatMatrix Usage Guide

## Quick Start

### Process Request (Universal Agent API)
\`\`\`json
{ "tool": "process_request", "arguments": { "input": { "name": "Admin", "issue": "failed login" } } }
\`\`\`

### Analyze a URL
\`\`\`json
{ "tool": "analyze_url", "arguments": { "url": "https://paypal.com.verify-login.xyz" } }
\`\`\`

### Scan a PDF
\`\`\`json
{ "tool": "analyze_pdf", "arguments": { "filePath": "/path/to/document.pdf" } }
\`\`\`

## Risk Levels
- **SAFE** (0-19): No significant threat indicators
- **SUSPICIOUS** (20-49): Some indicators requiring investigation  
- **HIGH** (50-74): Significant threat — action required
- **CRITICAL** (75-100): Confirmed threat — immediate action required
`,

  'threatmatrix://examples': JSON.stringify({
    examples: {
      universal: { tool: 'process_request', arguments: { input: 'URGENT: Please verify account' } },
      url: { tool: 'analyze_url', arguments: { url: 'http://paypal.com.verify-login.xyz/login' } },
      pdf: { tool: 'analyze_pdf', arguments: { filePath: '/samples/suspicious.pdf' } },
      email: { tool: 'analyze_email', arguments: { rawText: 'URGENT: Wire $50,000 immediately to avoid account suspension.' } },
      qr: { tool: 'analyze_qr', arguments: { qrData: 'https://malicious-site.xyz/steal-creds' } },
      image: { tool: 'analyze_image_text', arguments: { imageInput: 'URGENT verify account at http://phishing.com' } },
      iocs: { tool: 'extract_iocs', arguments: { text: 'Send payment to 1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf and visit http://malware.xyz' } },
    },
  }, null, 2),

  'threatmatrix://threat-feed': JSON.stringify({
    updated: new Date().toISOString(),
    activeThreats: [
      { id: 'T001', type: 'TYPOSQUATTING', description: 'PayPal brand impersonation campaign via .xyz TLD', severity: 'CRITICAL' },
      { id: 'T002', type: 'PDF_MALWARE', description: 'PDF /Launch exploit targeting enterprise endpoints', severity: 'HIGH' },
      { id: 'T003', type: 'QUISHING', description: 'QR code phishing campaign targeting mobile users', severity: 'HIGH' },
      { id: 'T004', type: 'BEC', description: 'CEO impersonation wire transfer campaign', severity: 'CRITICAL' },
      { id: 'T005', type: 'OCR_PHISHING', description: 'Screenshot-embedded phishing links bypassing email filters', severity: 'MEDIUM' },
    ],
  }, null, 2),

  'threatmatrix://recent-scans': JSON.stringify({
    generated: new Date().toISOString(),
    message: 'Use get_scan_history tool for real-time scan audit records.',
    totalRecordsAvailable: 'Query database via get_scan_history tool.',
  }, null, 2),

  'threatmatrix://policies': `# ThreatMatrix Security Risk Policies

## Risk Score Classification
| Score Range | Level       | Action Required                     |
|-------------|-------------|--------------------------------------|
| 0 - 19      | SAFE        | Normal monitoring                    |
| 20 - 49     | SUSPICIOUS  | Flag for investigation               |
| 50 - 74     | HIGH        | Block + alert security team          |
| 75 - 100    | CRITICAL    | Immediate containment + incident IR  |

## Automatic Actions by Risk Level
- **CRITICAL**: Auto-block domain at firewall, create incident ticket
- **HIGH**: Alert SOC, quarantine artifact, preserve evidence
- **SUSPICIOUS**: Log to SIEM, schedule follow-up investigation
- **SAFE**: Archive scan record for audit trail

## Compliance
Reports can be exported for SOC 2, ISO 27001, and PCI DSS audit requirements.
`,
};

export function registerResources(server: Server): void {
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    logger.debug('resources/list requested');
    return { resources: RESOURCES };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    logger.info('Resource read', { uri });

    const content = RESOURCE_CONTENT[uri];
    if (!content) {
      throw new McpError(ErrorCode.InvalidRequest, `Resource not found: ${uri}`);
    }

    const resource = RESOURCES.find(r => r.uri === uri);
    return {
      contents: [{
        uri,
        mimeType: resource?.mimeType ?? 'text/plain',
        text: content,
      }],
    };
  });
}
