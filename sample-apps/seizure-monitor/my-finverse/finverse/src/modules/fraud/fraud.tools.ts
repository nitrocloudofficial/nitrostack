import { Tool, Resource, Prompt, Injectable, ExecutionContext } from '@nitrostack/core';
import { z } from 'zod';
import { FraudService } from './fraud.service.js';

@Injectable({ deps: [FraudService] })
export class FraudController {
  constructor(private readonly fraudService: FraudService) {}

  @Tool({
    name: 'generate_sha256_fingerprint',
    description: 'Generate a SHA256 fingerprint for an invoice or transaction to detect duplicates.',
    inputSchema: z.object({
      data: z.string().describe('The data to hash')
    }),
    examples: { request: { data: 'invoice-123' }, response: { hash: 'abc123hash' } }
  })
  async generateSha256Fingerprint(input: { data: string }, context: ExecutionContext) {
    return { hash: this.fraudService.generateSha256Fingerprint(input.data) };
  }

  @Tool({
    name: 'verify_invoice',
    description: 'Verify invoice authenticity against GST and logistics data.',
    inputSchema: z.object({
      invoiceData: z.string().describe('Invoice details as JSON string')
    }),
    examples: { request: { invoiceData: '{"id":"INV001"}' }, response: { verified: true } }
  })
  async verifyInvoice(input: { invoiceData: string }, context: ExecutionContext) {
    const verified = await this.fraudService.verifyInvoice(input.invoiceData);
    return { verified };
  }

  @Tool({
    name: 'detect_duplicate_financing',
    description: 'Detect if an invoice has already been financed (double financing fraud).',
    inputSchema: z.object({
      invoiceHash: z.string().describe('Invoice SHA256 hash')
    }),
    examples: { request: { invoiceHash: 'abc123hash' }, response: { duplicate: false } }
  })
  async detectDuplicateFinancing(input: { invoiceHash: string }, context: ExecutionContext) {
    const duplicate = await this.fraudService.detectDuplicateFinancing(input.invoiceHash);
    return { duplicate };
  }

  @Tool({
    name: 'validate_gst',
    description: 'Validate a GSTIN number against GST portal.',
    inputSchema: z.object({
      gstin: z.string().describe('GST Identification Number (15 digits)')
    }),
    examples: { request: { gstin: '27AAAAA0000A1Z5' }, response: { valid: true } }
  })
  async validateGst(input: { gstin: string }, context: ExecutionContext) {
    const valid = await this.fraudService.validateGst(input.gstin);
    return { valid };
  }

  @Tool({
    name: 'validate_ewaybill',
    description: 'Validate an E-waybill number for logistics authenticity.',
    inputSchema: z.object({
      ewaybill: z.string().describe('E-waybill number')
    }),
    examples: { request: { ewaybill: '123456789012' }, response: { valid: true } }
  })
  async validateEwaybill(input: { ewaybill: string }, context: ExecutionContext) {
    const valid = await this.fraudService.validateEwaybill(input.ewaybill);
    return { valid };
  }

  @Tool({
    name: 'validate_delivery',
    description: 'Validate delivery confirmation via tracking number.',
    inputSchema: z.object({
      trackingNo: z.string().describe('Logistics tracking number')
    }),
    examples: { request: { trackingNo: 'TRK1234567' }, response: { valid: true } }
  })
  async validateDelivery(input: { trackingNo: string }, context: ExecutionContext) {
    const valid = await this.fraudService.validateDelivery(input.trackingNo);
    return { valid };
  }

  @Tool({
    name: 'calculate_fraud_score',
    description: 'Calculate overall fraud risk score for a transaction including Transaction Hash, Duplicate Financing status, GST Verification, Logistics Match, Invoice Authenticity and Fraud Risk Score.',
    inputSchema: z.object({
      invoiceData: z.string().describe('Invoice data as JSON string'),
      gstin: z.string().describe('GSTIN number'),
      ewaybill: z.string().describe('E-waybill number')
    }),
    examples: { request: { invoiceData: '{}', gstin: '27AAAAA0000A1Z5', ewaybill: '123456' }, response: { 'Fraud Risk Score': 0, 'Duplicate Financing': 'None' } }
  })
  async calculateFraudScore(input: { invoiceData: string; gstin: string; ewaybill: string }, context: ExecutionContext) {
    return this.fraudService.calculateFraudScore(input.invoiceData, input.gstin, input.ewaybill);
  }

  @Resource({
    uri: 'fraud://alerts',
    name: 'Fraud Alerts',
    description: 'Active fraud alerts for the current session',
    mimeType: 'application/json'
  })
  async getFraudAlertsResource(context: ExecutionContext) {
    return [{ type: 'duplicate_financing', hash: 'abc12345', severity: 'high' }];
  }

  @Resource({
    uri: 'gst://verification',
    name: 'GST Verification Log',
    description: 'Log of recent GST verifications',
    mimeType: 'application/json'
  })
  async getGstVerificationResource(context: ExecutionContext) {
    return [{ gstin: '27AAAAA0000A1Z5', status: 'Passed', timestamp: new Date().toISOString() }];
  }

  @Prompt({
    name: 'fraud_analysis',
    description: 'Analyze potential fraud cases and provide risk assessment',
    arguments: [{ name: 'transactionHash', description: 'Transaction hash to analyze', required: true }]
  })
  async getFraudAnalysisPrompt(args: Record<string, string>, context: ExecutionContext) {
    return [
      {
        role: 'user' as const,
        content: `Please analyze the fraud risk for transaction hash ${args['transactionHash']} and provide a detailed risk assessment with recommended actions.`
      }
    ];
  }
}
