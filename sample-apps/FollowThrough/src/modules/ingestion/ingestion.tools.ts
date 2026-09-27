import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { IngestionService } from './ingestion.service.js';
import { StoreService } from '../store/store.service.js';
import { LinearService } from '../linear/linear.service.js';
import { getSampleTranscripts } from './fixtures/transcripts.js';
import { todayISO } from '../../common/dates.js';
import { Commitment } from '../../common/types.js';

const ParticipantSchema = z.object({
  name: z.string(),
  email: z.string().optional(),
  slack_id: z.string().optional(),
  manager_email: z.string().optional(),
});

@Injectable({ deps: [IngestionService, StoreService, LinearService] })
export class IngestionTools {
  constructor(
    private ingestion: IngestionService,
    private store: StoreService,
    private linear: LinearService
  ) {}

  @Tool({
    name: 'extract_commitments',
    description:
      'Parses a meeting transcript and returns structured commitment objects: who promised what, to whom, by when, and with what confidence. For every commitment found it immediately creates a durable store record AND a Linear ticket \u2014 catching the 90% of commitments that would never become a manual ticket. Deduplicates against commitments already in the store.',
    inputSchema: z.object({
      transcript_id: z.string().describe('Stable id for this meeting'),
      transcript_text: z.string().describe('Full meeting transcript, one "Speaker: statement" per line'),
      meeting_date: z.string().describe('Meeting date as YYYY-MM-DD \u2014 used to resolve relative deadlines like "by Friday"'),
      participants: z.array(ParticipantSchema).default([]).describe('Optional roster to resolve owners against'),
    }),
    examples: {
      request: {
        transcript_id: 'mtg_ops_standup',
        transcript_text: 'Priya Shah: I\'ll get the vendor report over to Acme Logistics by Aug 1.\nMarcus Chen: I will publish the pricing API migration plan to the wiki by Aug 1.',
        meeting_date: '2026-07-29',
      },
      response: {
        extracted_count: 2,
        commitments: [
          {
            commitment_id: 'cmt_abc123',
            what: 'get the vendor report over to Acme Logistics',
            status: 'open',
            linked_ticket_id: 'LIN-481',
          },
        ],
      },
    },
  })
  async extractCommitments(
    input: { transcript_id: string; transcript_text: string; meeting_date: string; participants: any[] },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Extracting commitments', {
      transcript_id: input.transcript_id,
      llm_provider: this.ingestion.resolveProvider() ?? 'offline',
    });
    const meetingDate = input.meeting_date || todayISO();
    const extracted = await this.ingestion.extract({
      transcript_id: input.transcript_id,
      transcript_text: input.transcript_text,
      meeting_date: meetingDate,
      participants: input.participants,
    });

    const commitments: Commitment[] = [];
    const tickets: Array<{ ticket_id: string; title: string }> = [];

    for (const item of extracted) {
      if (item.owner.email && this.store.existsDuplicate(item.owner.email, item.what)) {
        continue;
      }
      const ticket = await this.linear.createTicket({
        title: item.what.charAt(0).toUpperCase() + item.what.slice(1),
        description: `Spoken commitment: "${item.text_raw}"`,
        assignee_email: item.owner.email,
        due_date: item.due_date || undefined,
        labels: ['commitment', item.confidence_level],
      });
      tickets.push({ ticket_id: ticket.ticket_id, title: ticket.title });

      const record = this.store.upsert({
        ...item,
        status: 'open',
        linked_ticket_id: ticket.ticket_id,
        evidence_log: [],
        nudge_log: [],
        escalation: null,
        created_at: meetingDate,
      });
      commitments.push(record);
    }

    return {
      extracted_count: extracted.length,
      created_count: commitments.length,
      skipped_duplicates: extracted.length - commitments.length,
      meeting_id: input.transcript_id,
      commitments,
      tickets,
    };
  }

  @Tool({
    name: 'get_sample_transcript',
    description:
      'Returns a ready-to-use sample meeting transcript (with participants and meeting date) designed to exercise all three confidence levels \u2014 paste its transcript_text into extract_commitments to run the demo flow.',
    inputSchema: z.object({}),
  })
  async getSampleTranscript(_input: Record<string, never>, ctx: ExecutionContext) {
    const [sample] = getSampleTranscripts();
    return { samples: getSampleTranscripts(), sample };
  }
}
