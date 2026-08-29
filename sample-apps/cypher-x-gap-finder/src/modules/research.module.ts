import { Module } from '@nitrostack/core';
import { GeminiService } from '../services/gemini.service.js';
import { IdeaService } from '../services/idea.service.js';
import { CompetitorDiscoveryService } from '../services/competitorDiscovery.service.js';
import { CompetitorProfileService } from '../services/competitorProfile.service.js';
import { CompetitorComparisonService } from '../services/competitorComparison.service.js';
import { MarketGapService } from '../services/marketGap.service.js';
import { InnovationScoreService } from '../services/innovationScore.service.js';
import { ReportGeneratorService } from '../services/reportGenerator.service.js';
import { PipelineOrchestratorService } from '../services/pipelineOrchestrator.service.js';
import { TavilyClient } from '../api/tavily.js';

import { UnderstandIdeaTools } from './understand_idea.tools.js';
import { DiscoverCompetitorsTools } from './discover_competitors.tools.js';
import { ExtractCompetitorProfilesTools } from './extract_competitor_profiles.tools.js';
import { CompareCompetitorsTools } from './compare_competitors.tools.js';
import { MarketGapAnalysisTools } from './market_gap_analysis.tools.js';
import { InnovationScoringTools } from './innovation_scoring.tools.js';
import { GenerateReportTools } from './generate_report.tools.js';
import { RunCompetitiveResearchTools } from './run_competitive_research.tools.js';

@Module({
    name: 'research',
    description: 'AI-Powered Competitive Research Assistant module',
    controllers: [
        UnderstandIdeaTools, 
        DiscoverCompetitorsTools,
        ExtractCompetitorProfilesTools,
        CompareCompetitorsTools,
        MarketGapAnalysisTools,
        InnovationScoringTools,
        GenerateReportTools,
        RunCompetitiveResearchTools
    ],
    providers: [
        GeminiService, 
        IdeaService, 
        CompetitorDiscoveryService, 
        CompetitorProfileService,
        CompetitorComparisonService,
        MarketGapService,
        InnovationScoreService,
        ReportGeneratorService,
        PipelineOrchestratorService,
        TavilyClient
    ],
    exports: [
        IdeaService, 
        GeminiService, 
        CompetitorDiscoveryService, 
        CompetitorProfileService,
        CompetitorComparisonService,
        MarketGapService,
        InnovationScoreService,
        ReportGeneratorService,
        PipelineOrchestratorService,
        TavilyClient
    ]
})
export class ResearchModule {}
