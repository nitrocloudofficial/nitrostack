import { Injectable } from '@nitrostack/core';
import { IdeaService } from './idea.service.js';
import { CompetitorDiscoveryService } from './competitorDiscovery.service.js';
import { CompetitorProfileService } from './competitorProfile.service.js';
import { CompetitorComparisonService } from './competitorComparison.service.js';
import { MarketGapService } from './marketGap.service.js';
import { InnovationScoreService } from './innovationScore.service.js';
import { ReportGeneratorService } from './reportGenerator.service.js';
import { 
    RunCompetitiveResearchInput, 
    RunCompetitiveResearchOutput,
    MarketGapAnalysisOutput,
    MarketGapAnalysisOutputSchema,
    InnovationScoringOutput,
    InnovationScoringOutputSchema,
    GenerateReportOutput,
    GenerateReportOutputSchema
} from '../types/pipeline.types.js';
import { UnderstandIdeaOutput, UnderstandIdeaOutputSchema } from '../types/idea.types.js';
import { Competitor, CompetitorSchema } from '../types/competitor.js';
import { CompetitorProfile, CompetitorProfileSchema } from '../types/profile.types.js';
import { CompareCompetitorsOutput, CompareCompetitorsOutputSchema } from '../types/comparison.types.js';
import { z } from 'zod';

interface StepState {
    stepNumber: number;
    stepName: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    error?: string;
}

@Injectable({
    deps: [
        IdeaService,
        CompetitorDiscoveryService,
        CompetitorProfileService,
        CompetitorComparisonService,
        MarketGapService,
        InnovationScoreService,
        ReportGeneratorService
    ]
})
export class PipelineOrchestratorService {
    constructor(
        private readonly ideaService: IdeaService,
        private readonly discoveryService: CompetitorDiscoveryService,
        private readonly profileService: CompetitorProfileService,
        private readonly comparisonService: CompetitorComparisonService,
        private readonly marketGapService: MarketGapService,
        private readonly innovationScoreService: InnovationScoreService,
        private readonly reportGeneratorService: ReportGeneratorService
    ) {}

    async runPipeline(input: RunCompetitiveResearchInput): Promise<RunCompetitiveResearchOutput> {
        console.error('[PipelineOrchestrator] [START] Starting Pipeline for:', input.idea);
        const startTime = Date.now();

        const steps: StepState[] = [
            { stepNumber: 1, stepName: 'Understanding Idea', status: 'pending' },
            { stepNumber: 2, stepName: 'Discovering Competitors', status: 'pending' },
            { stepNumber: 3, stepName: 'Extracting Competitor Profiles', status: 'pending' },
            { stepNumber: 4, stepName: 'Comparing Competitors', status: 'pending' },
            { stepNumber: 5, stepName: 'Market Gap Analysis', status: 'pending' },
            { stepNumber: 6, stepName: 'Innovation Scoring', status: 'pending' },
            { stepNumber: 7, stepName: 'Generating Report', status: 'pending' },
        ];

        let ideaAnalysis: UnderstandIdeaOutput | undefined;
        let competitors: Competitor[] = [];
        let profiles: CompetitorProfile[] = [];
        let comparison: CompareCompetitorsOutput | undefined;
        let marketGaps: MarketGapAnalysisOutput | undefined;
        let innovationScores: InnovationScoringOutput | undefined;
        let report: GenerateReportOutput | undefined;

        // --- STEP 1: Understand Idea ---
        try {
            steps[0].status = 'running';
            const stepStart = Date.now();
            console.error('[Pipeline] Executing Step 1: Understand Idea');
            
            const rawIdeaAnalysis = await this.ideaService.understand({
                idea: input.idea,
                industry: input.industry,
                geography: input.geography,
                targetAudience: input.targetAudience as any
            });

            // Validate Step 1 Output
            const validation = UnderstandIdeaOutputSchema.safeParse(rawIdeaAnalysis);
            if (!validation.success) {
                throw new Error(`Step 1 validation failed: ${validation.error.message}`);
            }
            ideaAnalysis = validation.data;
            steps[0].status = 'completed';
            console.error(`[Pipeline] Step 1 finished successfully in ${Date.now() - stepStart}ms`);
        } catch (err: any) {
            steps[0].status = 'failed';
            const errorMsg = `Step 1 (Understanding Idea) failed: ${err.message}`;
            console.error('[Pipeline] [Failure]', errorMsg);
            return {
                currentStep: 1,
                steps,
                status: 'failed',
                message: errorMsg,
                error: errorMsg,
                failedStep: 'Understanding Idea',
                competitors: [],
                profiles: []
            };
        }

        // --- STEP 2: Discover Competitors ---
        try {
            steps[1].status = 'running';
            const stepStart = Date.now();
            console.error('[Pipeline] Executing Step 2: Discover Competitors');
            
            const discoveryRes = await this.discoveryService.discover({
                idea: input.idea,
                category: ideaAnalysis.category,
                coreProblem: ideaAnalysis.coreProblem,
                targetAudience: ideaAnalysis.targetAudience,
                valueProposition: ideaAnalysis.valueProposition,
                keywords: ideaAnalysis.keywords,
                geography: input.geography
            });

            // Validate Step 2 Output list
            if (!discoveryRes.competitors) {
                throw new Error('Step 2 returned empty competitor payload.');
            }
            const validation = z.array(CompetitorSchema).safeParse(discoveryRes.competitors);
            if (!validation.success) {
                throw new Error(`Step 2 validation failed: ${validation.error.message}`);
            }
            competitors = validation.data;
            steps[1].status = 'completed';
            console.error(`[Pipeline] Step 2 finished successfully in ${Date.now() - stepStart}ms`);
        } catch (err: any) {
            steps[1].status = 'failed';
            const errorMsg = `Step 2 (Discovering Competitors) failed: ${err.message}`;
            console.error('[Pipeline] [Failure]', errorMsg);
            return {
                currentStep: 2,
                steps,
                ideaAnalysis,
                status: 'failed',
                message: errorMsg,
                error: errorMsg,
                failedStep: 'Discovering Competitors',
                competitors: [],
                profiles: []
            };
        }

        // --- STEP 3: Extract Competitor Profiles ---
        try {
            steps[2].status = 'running';
            const stepStart = Date.now();
            console.error('[Pipeline] Executing Step 3: Extract Competitor Profiles');
            
            const profileRes = await this.profileService.extractProfiles({
                competitors,
                ideaAnalysis
            });

            // Validate Step 3 Output
            const validation = z.array(CompetitorProfileSchema).safeParse(profileRes.profiles);
            if (!validation.success) {
                throw new Error(`Step 3 validation failed: ${validation.error.message}`);
            }
            profiles = validation.data;
            steps[2].status = 'completed';
            console.error(`[Pipeline] Step 3 finished successfully in ${Date.now() - stepStart}ms`);
        } catch (err: any) {
            steps[2].status = 'failed';
            const errorMsg = `Step 3 (Extracting Competitor Profiles) failed: ${err.message}`;
            console.error('[Pipeline] [Failure]', errorMsg);
            return {
                currentStep: 3,
                steps,
                ideaAnalysis,
                competitors,
                status: 'failed',
                message: errorMsg,
                error: errorMsg,
                failedStep: 'Extracting Competitor Profiles',
                profiles: []
            };
        }

        // --- STEP 4: Compare Competitors ---
        try {
            steps[3].status = 'running';
            const stepStart = Date.now();
            console.error('[Pipeline] Executing Step 4: Compare Competitors');
            
            const rawComparison = await this.comparisonService.compare({ profiles });
            
            // Validate Step 4 Output
            const validation = CompareCompetitorsOutputSchema.safeParse(rawComparison);
            if (!validation.success) {
                throw new Error(`Step 4 validation failed: ${validation.error.message}`);
            }
            comparison = validation.data;
            steps[3].status = 'completed';
            console.error(`[Pipeline] Step 4 finished successfully in ${Date.now() - stepStart}ms`);
        } catch (err: any) {
            steps[3].status = 'failed';
            const errorMsg = `Step 4 (Comparing Competitors) failed: ${err.message}`;
            console.error('[Pipeline] [Failure]', errorMsg);
            return {
                currentStep: 4,
                steps,
                ideaAnalysis,
                competitors,
                profiles,
                status: 'failed',
                message: errorMsg,
                error: errorMsg,
                failedStep: 'Comparing Competitors'
            };
        }

        // --- STEP 5: Market Gap Analysis ---
        try {
            steps[4].status = 'running';
            const stepStart = Date.now();
            console.error('[Pipeline] Executing Step 5: Market Gap Analysis');
            
            const rawMarketGaps = await this.marketGapService.analyzeGaps(ideaAnalysis, profiles, comparison);
            
            // Validate Step 5 Output
            const validation = MarketGapAnalysisOutputSchema.safeParse(rawMarketGaps);
            if (!validation.success) {
                throw new Error(`Step 5 validation failed: ${validation.error.message}`);
            }
            marketGaps = validation.data;
            steps[4].status = 'completed';
            console.error(`[Pipeline] Step 5 finished successfully in ${Date.now() - stepStart}ms`);
        } catch (err: any) {
            steps[4].status = 'failed';
            const errorMsg = `Step 5 (Market Gap Analysis) failed: ${err.message}`;
            console.error('[Pipeline] [Failure]', errorMsg);
            return {
                currentStep: 5,
                steps,
                ideaAnalysis,
                competitors,
                profiles,
                comparison,
                status: 'failed',
                message: errorMsg,
                error: errorMsg,
                failedStep: 'Market Gap Analysis'
            };
        }

        // --- STEP 6: Innovation Scoring ---
        try {
            steps[5].status = 'running';
            const stepStart = Date.now();
            console.error('[Pipeline] Executing Step 6: Innovation Scoring');
            
            const rawInnovationScores = await this.innovationScoreService.scoreInnovation(ideaAnalysis, profiles, marketGaps);
            
            // Validate Step 6 Output
            const validation = InnovationScoringOutputSchema.safeParse(rawInnovationScores);
            if (!validation.success) {
                throw new Error(`Step 6 validation failed: ${validation.error.message}`);
            }
            innovationScores = validation.data;
            steps[5].status = 'completed';
            console.error(`[Pipeline] Step 6 finished successfully in ${Date.now() - stepStart}ms`);
        } catch (err: any) {
            steps[5].status = 'failed';
            const errorMsg = `Step 6 (Innovation Scoring) failed: ${err.message}`;
            console.error('[Pipeline] [Failure]', errorMsg);
            return {
                currentStep: 6,
                steps,
                ideaAnalysis,
                competitors,
                profiles,
                comparison,
                marketGaps,
                status: 'failed',
                message: errorMsg,
                error: errorMsg,
                failedStep: 'Innovation Scoring'
            };
        }

        // --- STEP 7: Generate Report ---
        try {
            steps[6].status = 'running';
            const stepStart = Date.now();
            console.error('[Pipeline] Executing Step 7: Generate Report');
            
            const rawReport = await this.reportGeneratorService.generateReport(
                ideaAnalysis,
                competitors,
                profiles,
                comparison,
                marketGaps,
                innovationScores
            );

            // Validate Step 7 Output
            const validation = GenerateReportOutputSchema.safeParse(rawReport);
            if (!validation.success) {
                throw new Error(`Step 7 validation failed: ${validation.error.message}`);
            }
            report = validation.data;
            steps[6].status = 'completed';
            console.error(`[Pipeline] Step 7 finished successfully in ${Date.now() - stepStart}ms`);
        } catch (err: any) {
            steps[6].status = 'failed';
            const errorMsg = `Step 7 (Generating Report) failed: ${err.message}`;
            console.error('[Pipeline] [Failure]', errorMsg);
            return {
                currentStep: 7,
                steps,
                ideaAnalysis,
                competitors,
                profiles,
                comparison,
                marketGaps,
                innovationScores,
                status: 'failed',
                message: errorMsg,
                error: errorMsg,
                failedStep: 'Generating Report'
            };
        }

        const totalTime = Date.now() - startTime;
        console.error(`[PipelineOrchestrator] [END] All 7 Steps Completed in ${totalTime}ms`);

        return {
            currentStep: 7,
            steps,
            ideaAnalysis,
            competitors,
            profiles,
            comparison,
            marketGaps,
            innovationScores,
            report,
            status: 'success',
            message: 'All 7 competitive research steps executed successfully.'
        };
    }
}
