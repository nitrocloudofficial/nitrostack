import { ToolDecorator as Tool, Widget, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { LegalService } from './legal.service.js';

function legalWidget(route: string) {
    return {
        route,
        prefersBorder: true,
    };
}

@Injectable({ deps: [LegalService] })
export class LegalTools {
  constructor(private readonly legalService: LegalService) {}

  @Tool({
    name: 'search_law',
    description: 'Searches Constitution articles and Labour Code sections for provisions relevant to a worker issue. Returns matched entries with citations.',
    inputSchema: z.object({
      query: z.string().describe('Keyword or issue description, e.g. "unpaid wages" or "unsafe conditions"'),
    }),
  })
  async searchLaw({ query }: { query: string }, ctx: ExecutionContext) {
    ctx.logger.info('Searching law', { query });
    const matches = this.legalService.searchLaw(query);

    if (matches.length === 0) {
      return {
        content: [{ type: 'text' as const, text: `No matching provisions found for "${query}".` }],
      };
    }

    const formatted = matches
      .map((m) => `**${m.id} — ${m.title}**${m.part ? ` (${m.part})` : ''}\n${m.summary}\n_Citation: "${m.text}"_`)
      .join('\n\n');

    return {
      content: [{ type: 'text' as const, text: `Found ${matches.length} relevant provision(s):\n\n${formatted}` }],
    };
  }

  @Tool({
    name: 'get_procedure',
    description: 'Returns the step-by-step filing process for a worker complaint, e.g. unpaid wages.',
    inputSchema: z.object({
      issue_type: z.string().describe('The type of issue, e.g. "unpaid wages" or "complaint"'),
    }),
  })
  async getProcedure({ issue_type }: { issue_type: string }, ctx: ExecutionContext) {
    ctx.logger.info('Getting procedure', { issue_type });
    const stepsToShow = this.legalService.getProcedures(issue_type);

    const formatted = stepsToShow
      .map((s) => `${s.id}: **${s.title}**\n${s.summary}`)
      .join('\n\n');

    return {
      content: [{ type: 'text' as const, text: `Filing procedure:\n\n${formatted}` }],
    };
  }

  @Tool({
    name: 'check_deadline',
    description: 'Check filing deadline and limitation period for an issue type and state.',
    inputSchema: z.object({
      issueType: z.string().describe('Type of issue, e.g. "wages" or "gratuity"'),
      incidentDate: z.string().describe('Date of incident, formatted YYYY-MM-DD'),
      state: z.string().describe('Indian state, e.g. "Maharashtra"'),
    }),
  })
  async checkDeadline(args: { issueType: string; incidentDate: string; state: string }, ctx: ExecutionContext) {
    ctx.logger.info('Checking deadline', args);
    const result = this.legalService.checkDeadline(args.issueType, args.incidentDate, args.state);
    return {
      content: [{
        type: 'text' as const,
        text: `Deadline assessment:\n` +
          `- Limitation Period: ${result.limitationPeriod}\n` +
          `- Days Elapsed: ${result.daysElapsed}\n` +
          `- Status: ${result.isPassed ? 'PASSED' : (result.isApproaching ? 'APPROACHING DEADLINE' : 'WITHIN TIME LIMIT')}`
      }],
      result
    };
  }

  @Tool({
    name: 'find_authority',
    description: 'Find correct body to file complaint based on issue type and state.',
    inputSchema: z.object({
      issueType: z.string().describe('Type of issue, e.g. "wages" or "harassment"'),
      state: z.string().describe('Indian state, e.g. "Maharashtra"'),
    }),
  })
  async findAuthority(args: { issueType: string; state: string }, ctx: ExecutionContext) {
    ctx.logger.info('Finding authority', args);
    const result = this.legalService.findAuthority(args.issueType, args.state);
    return {
      content: [{
        type: 'text' as const,
        text: `Recommended Authority:\n` +
          `- Body: ${result.body}\n` +
          `- Description: ${result.description}\n` +
          `- Contact / Filing info: ${result.contactInfo}`
      }],
      result
    };
  }

  @Tool({
    name: 'generate_legal_brief',
    description: 'Generate structured legal brief document for the worker.',
    inputSchema: z.object({
      caseData: z.object({
        workerName: z.string(),
        employerName: z.string(),
        employmentType: z.string(),
        state: z.string(),
        incidentDate: z.string().optional(),
        issueSummary: z.string(),
        timeline: z.array(z.string()),
        potentialIssues: z.array(z.object({
          issue: z.string(),
          reason: z.string()
        })),
        evidence: z.array(z.string()),
        lawCitations: z.array(z.string()),
        filingDeadline: z.string(),
        recommendedAuthority: z.string(),
      })
    })
  })
  @Widget(legalWidget('legal-brief'))
  async generateLegalBrief(args: {
    caseData: {
      workerName: string;
      employerName: string;
      employmentType: string;
      state: string;
      incidentDate?: string;
      issueSummary: string;
      timeline: string[];
      potentialIssues: { issue: string; reason: string }[];
      evidence: string[];
      lawCitations: string[];
      filingDeadline: string;
      recommendedAuthority: string;
    }
  }, ctx: ExecutionContext) {
    ctx.logger.info('Generating legal brief', args.caseData);
    return args.caseData;
  }

  @Tool({
    name: 'generate_incident_log',
    description: 'Generate formatted dated incident log.',
    inputSchema: z.object({
      incidents: z.array(z.object({
        date: z.string().describe('Date of incident, YYYY-MM-DD'),
        time: z.string().optional(),
        location: z.string().optional(),
        whoPresent: z.string().optional(),
        description: z.string(),
        evidenceSaved: z.string().optional(),
      }))
    })
  })
  @Widget(legalWidget('incident-log'))
  async generateIncidentLog(args: {
    incidents: {
      date: string;
      time?: string;
      location?: string;
      whoPresent?: string;
      description: string;
      evidenceSaved?: string;
    }[]
  }, ctx: ExecutionContext) {
    ctx.logger.info('Generating incident log', args);
    return args;
  }
}