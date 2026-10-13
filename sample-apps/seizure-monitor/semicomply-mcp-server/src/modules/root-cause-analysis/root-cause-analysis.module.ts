import { Module } from '@nitrostack/core';
import { RootCauseAnalysisService } from './root-cause-analysis.service.js';
import { RootCauseAnalysisTools } from './root-cause-analysis.tools.js';

@Module({
    name: 'root-cause-analysis',
    description: 'Root cause analysis module',
    controllers: [RootCauseAnalysisTools],
    providers: [RootCauseAnalysisService],
})
export class RootCauseAnalysisModule { }
