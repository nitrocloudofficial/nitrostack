import { Tool, Resource, Prompt, Injectable, ExecutionContext } from '@nitrostack/core';
import { z } from 'zod';
import { SuccessionService } from './succession.service.js';

@Injectable({ deps: [SuccessionService] })
export class SuccessionController {
  constructor(private readonly successionService: SuccessionService) {}

  @Tool({
    name: 'register_nominee',
    description: 'Register a nominee for asset succession.',
    inputSchema: z.object({
      userId: z.string().describe('User ID'),
      nomineeName: z.string().describe('Full name of the nominee'),
      relationship: z.string().describe('Relationship to the user (e.g., Spouse, Child)')
    }),
    examples: { request: { userId: 'user1', nomineeName: 'Jane Doe', relationship: 'Spouse' }, response: { success: true } }
  })
  async registerNominee(input: { userId: string; nomineeName: string; relationship: string }, context: ExecutionContext) {
    return { success: await this.successionService.registerNominee(input.userId, { name: input.nomineeName, relationship: input.relationship }) };
  }

  @Tool({
    name: 'verify_death_registry',
    description: 'Verify death registration in government registry.',
    inputSchema: z.object({
      userId: z.string().describe('User ID')
    }),
    examples: { request: { userId: 'user1' }, response: { verified: true } }
  })
  async verifyDeathRegistry(input: { userId: string }, context: ExecutionContext) {
    return { verified: await this.successionService.verifyDeathRegistry(input.userId) };
  }

  @Tool({
    name: 'discover_assets',
    description: 'Discover all assets including Insurance, Provident Fund, and Deposits.',
    inputSchema: z.object({
      userId: z.string().describe('User ID')
    }),
    examples: { request: { userId: 'user1' }, response: { Insurance: 100000, 'Provident Fund': 50000, Deposits: 25000 } }
  })
  async discoverAssets(input: { userId: string }, context: ExecutionContext) {
    return this.successionService.discoverAssets(input.userId);
  }

  @Tool({
    name: 'scan_death_certificate',
    description: 'Scan and verify a death certificate document.',
    inputSchema: z.object({
      fileData: z.string().describe('Base64 encoded certificate file data')
    }),
    examples: { request: { fileData: 'base64data...' }, response: { verified: true } }
  })
  async scanDeathCertificate(input: { fileData: string }, context: ExecutionContext) {
    return { verified: await this.successionService.scanDeathCertificate(input.fileData) };
  }

  @Tool({
    name: 'generate_claim_forms',
    description: 'Generate all necessary claim forms for succession.',
    inputSchema: z.object({
      userId: z.string().describe('User ID')
    }),
    examples: { request: { userId: 'user1' }, response: { forms: ['form_a.pdf', 'form_b.pdf'] } }
  })
  async generateClaimForms(input: { userId: string }, context: ExecutionContext) {
    return { forms: await this.successionService.generateClaimForms(input.userId) };
  }

  @Tool({
    name: 'notify_nominee',
    description: 'Notify the registered nominee about the succession process.',
    inputSchema: z.object({
      userId: z.string().describe('User ID'),
      nomineeId: z.string().describe('Nominee ID')
    }),
    examples: { request: { userId: 'user1', nomineeId: 'nominee1' }, response: { success: true } }
  })
  async notifyNominee(input: { userId: string; nomineeId: string }, context: ExecutionContext) {
    return { success: await this.successionService.notifyNominee(input.userId, input.nomineeId) };
  }

  @Tool({
    name: 'transfer_assets',
    description: 'Transfer assets to the registered nominee upon verified succession.',
    inputSchema: z.object({
      userId: z.string().describe('User ID'),
      nomineeId: z.string().describe('Nominee ID')
    }),
    examples: { request: { userId: 'user1', nomineeId: 'nominee1' }, response: { success: true } }
  })
  async transferAssets(input: { userId: string; nomineeId: string }, context: ExecutionContext) {
    return { success: await this.successionService.transferAssets(input.userId, input.nomineeId) };
  }

  @Resource({
    uri: 'succession://claims',
    name: 'Succession Claims',
    description: 'Status of active succession claims',
    mimeType: 'application/json'
  })
  async getSuccessionClaimsResource(context: ExecutionContext) {
    return [{ claimId: 'CLM123', status: 'Processing', userId: 'user1' }];
  }

  @Prompt({
    name: 'succession_assistant',
    description: 'Assistant for managing succession plans and claims',
    arguments: [{ name: 'userId', description: 'User ID', required: true }]
  })
  async getSuccessionAssistantPrompt(args: Record<string, string>, context: ExecutionContext) {
    return [
      {
        role: 'user' as const,
        content: `Help me manage the succession plan for user ${args['userId']}. Guide me through nominee registration, asset discovery, and claim processing.`
      }
    ];
  }
}
