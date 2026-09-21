import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { EvidenceService } from './evidence.service.js';

@Injectable({ deps: [EvidenceService] })
export class EvidenceTools {
  constructor(private evidence: EvidenceService) {}

  @Tool({
    name: 'search_slack_evidence',
    description:
      'Searches Slack for messages that could constitute evidence a commitment was fulfilled. Returns raw candidate messages; the verification agent scores them semantically rather than trusting keyword hits.',
    inputSchema: z.object({
      query_terms: z.array(z.string()).describe('Keywords or phrases from the commitment to match'),
      channel_hint: z.string().optional().describe('e.g. vendor-acme'),
      participant_slack_id: z.string().optional().describe('Restrict to one author'),
      since: z.string().describe('YYYY-MM-DD \u2014 only messages on or after this date'),
    }),
    examples: {
      request: { query_terms: ['vendor', 'report', 'acme'], since: '2026-07-29' },
      response: { results: [{ message_id: 'slk_1001', channel: 'vendor-acme', text: 'Sent the updated vendor report to Acme...' }] },
    },
  })
  async searchSlack(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Searching Slack evidence', { terms: input.query_terms, since: input.since });
    const results = await this.evidence.searchSlack(input);
    return { count: results.length, results };
  }

  @Tool({
    name: 'search_email_evidence',
    description:
      'Searches a mocked inbox/sent-items store for emails relevant to a commitment \u2014 e.g. mail sent to an external beneficiary that proves the work shipped.',
    inputSchema: z.object({
      query_terms: z.array(z.string()),
      to_domain_hint: z.string().optional().describe('e.g. acmelogistics.com'),
      since: z.string().describe('YYYY-MM-DD \u2014 only emails on or after this date'),
    }),
    examples: {
      request: { query_terms: ['report', 'acme'], to_domain_hint: 'acmelogistics.com', since: '2026-07-29' },
      response: { results: [{ message_id: 'eml_2001', from: 'priya@company.com', to: 'contact@acmelogistics.com' }] },
    },
  })
  async searchEmail(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Searching email evidence', { terms: input.query_terms, since: input.since });
    const results = await this.evidence.searchEmail(input);
    return { count: results.length, results };
  }
}
