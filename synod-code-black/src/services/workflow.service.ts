import { EventEmitter } from 'events';
import { TranscriptService } from './transcript.service';
import { LlmService } from './llm.service';
import { McpService } from './mcp.service';
import { AdvocateAgent } from '../agents/advocate.agent';
import { CriticAgent } from '../agents/critic.agent';
import { VerdictAgent } from '../agents/verdict.agent';
import * as fs from 'fs';
import * as path from 'path';

export class WorkflowService extends EventEmitter {
    private llm: LlmService;
    private mcp: McpService;

    constructor(private transcriptService: TranscriptService) {
        super();
        this.llm = new LlmService();
        this.mcp = new McpService();
    }

    public async executeDebate(caseData: any): Promise<void> {
        try {
            // 1. Connect to our internal MCP Server bridge before starting
            await this.mcp.connect();

            const caseId = caseData.id || 'UNKNOWN-CASE';
            console.log(`\n⚖️ [Workflow] Starting AI-driven debate for Case ID: ${caseId}`);
            this.emit('DEBATE_STARTED', { caseId });

            const advocate = new AdvocateAgent(this.llm);
            const critic = new CriticAgent(this.llm);
            const verdict = new VerdictAgent(this.llm);

            // Step 1: Advocate
            console.log(`[Workflow] 🗣️  AI Advocate is preparing their pitch...`);
            this.emit('ON_ADVOCATE_SPEAKING');
            const advocateRes = await advocate.analyze(caseData);
            this.transcriptService.addMessage('Advocate', advocateRes.argument);
            this.emit('TRANSCRIPT_UPDATED', this.transcriptService.getTranscript());

            // Step 2: Intercept
            console.log(`[Workflow] 🛑 Halting AI. Routing fact-check through MCP Bridge...`);
            this.emit('ON_FACT_CHECKING');
            
            const factCheckResults: any[] = [];
            if (advocateRes.claimsToVerify && Array.isArray(advocateRes.claimsToVerify)) {
                for (const claim of advocateRes.claimsToVerify) {
                    // Call tool dynamically over MCP
                    const result = await this.mcp.callTool('verify_claim', {
                        claimType: claim.claimType,
                        claimedValue: claim.claimedValue,
                        contextId: caseId
                    });
                    
                    factCheckResults.push(result);
                    if (!result.success) {
                        this.transcriptService.addMessage('System', `❌ Unsupported: ${result.message}`, true);
                        this.emit('ON_FACT_CHECK_FAILED', { message: result.message });
                    } else {
                        this.emit('ON_FACT_CHECK_PASSED', { message: result.message });
                    }
                }
            }
            this.emit('TRANSCRIPT_UPDATED', this.transcriptService.getTranscript());

            // Add some async mock market data fetch over MCP
            const marketData = await this.mcp.callTool('get_market_data', { sector: caseData.applicant.industry });
            factCheckResults.push(marketData);
            
            this.emit('DATA_VISUALIZATION', {
                title: 'Market Growth Comparison',
                labels: ['Applicant Claim', 'Actual Industry Avg'],
                datasets: [
                    {
                        label: 'Growth %',
                        data: [caseData.financials_unaudited?.revenue_growth_percentage || 0, marketData.current_growth_rate],
                        backgroundColor: ['#60a5fa', '#f97316']
                    }
                ]
            });

            // Step 3: Critic
            console.log(`[Workflow] 🕵️  AI Skeptic is preparing rebuttal using intercept context...`);
            this.emit('ON_SKEPTIC_SPEAKING');
            const criticRes = await critic.analyze(caseData, advocateRes, factCheckResults);
            this.transcriptService.addMessage('Skeptic', criticRes.rebuttal);
            this.emit('TRANSCRIPT_UPDATED', this.transcriptService.getTranscript());

            // Step 4: Verdict
            console.log(`[Workflow] 🧑‍⚖️  AI Verdict is synthesizing the full debate...`);
            this.emit('ON_VERDICT_SPEAKING');
            const verdictRes = await verdict.analyze(this.transcriptService.getContextString());
            this.transcriptService.addMessage('Verdict', `Decision: ${verdictRes.decision}\nRationale: ${verdictRes.rationale}`);
            this.emit('TRANSCRIPT_UPDATED', this.transcriptService.getTranscript());

            console.log(`[Workflow] ✅ AI Debate cycle finished successfully.`);
            this.emit('DEBATE_COMPLETED');

        } catch (error) {
            console.error('[Workflow] Error executing debate:', error);
        }
    }
}
