import { ToolDecorator as Tool, ExecutionContext, Injectable } from '@nitrostack/core';
import { z } from 'zod';
import { RedlineService } from '../risk/redline.service.js';
import { RedactionService } from '../redaction/redaction.service.js';
import { RiskService } from '../risk/risk.service.js';
import { GraphService } from '../graph/graph.service.js';
import { ParserService } from '../ingestion/parser.service.js';

@Injectable({ deps: [RedlineService, RedactionService, RiskService, GraphService, ParserService] })
export class PipelineTools {
  static instance: PipelineTools;

  constructor(
    public redlineService: RedlineService,
    public redactionService: RedactionService,
    public riskService: RiskService,
    public graphService: GraphService,
    public parserService: ParserService
  ) {
    PipelineTools.instance = this;
  }

  @Tool({
    name: 'run_full_pipeline',
    description: 'Run the end-to-end Phalanx analysis pipeline. Accepts EITHER a URL to a PDF/Word file (preferred for file uploads), OR raw text. Parses, redact, builds the knowledge graph, runs all 4 risk agents, and synthesizes redlines in one call.',
    inputSchema: z.object({
      url: z.string().optional().describe('URL to the uploaded PDF or Word document (if available)'),
      filename: z.string().optional().describe('Original filename (required if url is used)'),
      text: z.string().optional().describe('The raw text of the document (use this if url is not available)'),
      contractType: z.string().default('general_contract').describe('Optional contract type, default general_contract')
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true }
  })
  async runFullPipeline(input: any, ctx: ExecutionContext) {
    if (!input.url && !input.text) {
      return { error: 'Must provide either url or text to run the pipeline.' };
    }

    let documentText = input.text || '';
    if (input.url && input.filename) {
      ctx.logger.info('[Step 0/5] Parsing document from URL');
      const parsed = await this.parserService.parse(input.url, input.filename);
      documentText = parsed.text;
    }

    const { contractType } = input;
    const sessionId = `sess_${Date.now()}`;
    
    ctx.logger.info('[Step 2/5] Redacting under the selected policy');
    const redactionResult = await this.redactionService.redact(documentText, contractType, sessionId);
    
    ctx.logger.info('[Step 3/5] Building the clause knowledge graph');
    const graph = await this.graphService.buildFromText(
      redactionResult.redactedText,
      contractType,
      sessionId
    );

    ctx.logger.info('[Step 4/5] Running all 4 specialized Risk Agents concurrently');
    const analysis = await this.riskService.runAllAgents(graph.graphId);

    ctx.logger.info('[Step 5/5] Synthesizing redlines and the negotiation email');
    const proposal = await this.redlineService.synthesize(graph.graphId, sessionId, {
      findings: analysis.findings,
      restore: true
    });

    const responsePayload = {
      documentId: graph.graphId,
      sessionId,
      contractType,
      riskScore: proposal.riskScore,
      scoreBreakdown: analysis.scoreBreakdown,
      strengths: analysis.strengths,
      summary: proposal.summary,
      // Include negotiation email and redline recommendations in final pipeline output
      negotiationEmail: proposal.negotiationEmail,
      redlines: proposal.redlines,
      findings: analysis.findings.map((finding: any) => {
        const redline = proposal.redlines.find((r: any) => r.findingId === finding.id) ?? null;
        return {
          agent: finding.agent,
          severity: finding.severity,
          category: finding.category,
          title: finding.issue,
          businessImpact: finding.businessImpact,
          recommendation: finding.recommendation,
          redline: redline ? { proposed: redline.proposedText, reason: redline.reason } : null
        };
      })
    };

    return responsePayload;
  }
}
