import { Module } from '@nitrostack/core';
import { ScoringTools } from './scoring.tools.js';
import { TopLayerTools } from './top-layer.tools.js';
import { CaseStoreModule } from '../case-store/case-store.module.js';

@Module({
    name: 'scoring',
    description: 'Scoring + Top Layer — case scoring, case initialization, evidence graph, verification report',
    imports: [CaseStoreModule],
    controllers: [ScoringTools, TopLayerTools],
})
export class ScoringModule { }
