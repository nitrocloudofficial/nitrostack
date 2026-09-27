# ThreatMatrix Architecture & NitroStack Integration Guide

## Overview

ThreatMatrix is a production-grade Model Context Protocol (MCP) Server designed for the NitroStack Marketplace. It performs multi-vector cybersecurity threat analysis across URLs, PDF documents, emails, QR codes, screenshot images, and structured text payloads using an Agentic AI reasoning engine and real Threat Intelligence APIs.

## 27 MCP Tools Specification

| Index | Tool Name | Parameters | Description |
| --- | --- | --- | --- |
| 1 | `process_request` | `{ input: any, context?: string }` | Universal Agentic AI Pipeline for all formats (JSON, XML, CSV, Logs, PDF, URLs, Code, Text) |
| 2 | `analyze_url` | `{ url: string }` | Typosquatting, IP hosts, shortener, Google Safe Browsing & WHOIS inspection |
| 3 | `expand_short_url` | `{ url: string }` | Unmask target redirect destination |
| 4 | `check_domain` | `{ domain: string }` | WHOIS, domain age, TLD risk analysis |
| 5 | `lookup_ip` | `{ ip: string }` | IP host reputation & AbuseIPDB threat confidence score |
| 6 | `lookup_hash` | `{ hash: string }` | Cryptographic hash intelligence & VirusTotal detection ratio |
| 7 | `analyze_pdf` | `{ filePath: string }` | Binary stream scanning (`/JavaScript`, `/Launch`, `/OpenAction`) & Groq AI scan |
| 8 | `extract_iocs` | `{ text: string }` | Regex extraction of URLs, IPs, Emails, Domains, Crypto Wallets |
| 9 | `calculate_hash` | `{ content: string }` | MD5, SHA1, and SHA256 cryptographic hashing |
| 10 | `analyze_email` | `{ rawText: string }` | BEC, urgency coercion, credential theft detection |
| 11 | `analyze_headers` | `{ headers: string }` | Email header parsing (SPF, DKIM, DMARC, relay hops) |
| 12 | `detect_phishing_language` | `{ text: string }` | Psychological pressure & financial demand detection |
| 13 | `analyze_qr` | `{ qrData: string }` | QR payload decoding & target link inspection |
| 14 | `decode_qr` | `{ input: string }` | Raw payload extraction from QR code images |
| 15 | `analyze_image_text` | `{ imageInput: string }` | Google Gemini AI Vision & OCR text security analysis |
| 16 | `correlate_findings` | `{ scannerOutputs: array }` | Multi-vector scanner output correlation & confidence score |
| 17 | `generate_risk_score` | `{ scoreInput: number }` | Standard risk score (0-100) & risk level assignment |
| 18 | `generate_report` | `{ scanId, format }` | Report generator (JSON, Markdown, HTML, PDF) |
| 19 | `export_report` | `{ reportData }` | Save report to persistent vault |
| 20 | `save_scan` | `{ scanData }` | Audit record persistence in Prisma Postgres |
| 21 | `get_scan_history` | `{ limit?: number }` | Retrieve audit history log |
| 22 | `delete_scan` | `{ scanId: string }` | Delete audit log entry |
| 23 | `health_check` | `{}` | Operational health status |
| 24 | `server_status` | `{}` | Active tools count & uptime |
| 25 | `supported_formats` | `{}` | List supported input formats |
| 26 | `version` | `{}` | Return ThreatMatrix version (1.0.0) |
| 27 | `capabilities` | `{}` | Enumerate MCP tool, resource, and prompt capabilities |

## Output Schema

```json
{
  "id": "tm_1721900000000_a1b2c3",
  "timestamp": "2026-07-25T16:27:00.000Z",
  "tool": "process_request",
  "input": { "url": "http://paypal.com.verify-login.xyz" },
  "riskScore": 85,
  "riskLevel": "CRITICAL",
  "confidence": 0.95,
  "summary": "Analyzed URL http://paypal.com.verify-login.xyz",
  "findings": [
    { "category": "TYPOSQUATTING", "description": "Typosquatting brand impersonation", "severity": "CRITICAL" }
  ],
  "recommendations": ["Do NOT open link. Block domain at firewall."],
  "metadata": { "ssl": false }
}
```
