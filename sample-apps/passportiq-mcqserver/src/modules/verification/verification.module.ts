/**
 * VerificationModule — the seven real verification stages (Backend A).
 *
 * This replaces the placeholder VerificationStubModule that used to live here.
 * The eight tools registered below are the actual implementations:
 *
 *   document_validate            (stage 1)  DocumentVerificationTools
 *   ocr_extract                  (stage 2)  DocumentVerificationTools
 *   check_identity_consistency   (stage 3)  ConsistencyVerificationTools
 *   check_address_consistency    (stage 4)  ConsistencyVerificationTools
 *   visual_similarity_flag       (optional) ConsistencyVerificationTools
 *   evaluate_rules               (stage 7)  AssessmentTools
 *   score_risk                   (stage 8)  AssessmentTools
 *   explain_risk                 (stage 9)  AssessmentTools
 *
 * Stages 5 and 6 (detect_duplicate_signals, build_risk_graph) belong to
 * PipelineModule, as does the guarded officer_decide.
 *
 * ---------------------------------------------------------------------------
 * WHY `providers` LISTS ONLY THIS MODULE'S OWN SERVICES
 * ---------------------------------------------------------------------------
 * Listing a class in `providers` REGISTERS it. Registering a class that another
 * module already registered creates a SECOND instance, and then the two modules
 * are talking to different objects. Concretely: if ApplicationService or
 * PipelineStateService were repeated here, this module's tools would record
 * their stage results into a PipelineStateService that PipelineCompleteGuard
 * never reads — so the officer decision gate would stay locked forever with no
 * error message anywhere. That failure is silent, which is what makes it
 * expensive.
 *
 * ApplicationService, GraphService, PipelineStateService and PipelineEventsService
 * are therefore reached through `imports: [PipelineModule]`, which re-uses
 * PipelineModule's singletons via its `exports`.
 *
 * ---------------------------------------------------------------------------
 * THIS MODULE MUST ALSO BE LISTED IN src/app.module.ts
 * ---------------------------------------------------------------------------
 * @nitrostack/core does NOT walk the module graph recursively — being imported
 * by another feature module is not enough. See the header of app.module.ts.
 */
import { Module } from '@nitrostack/core';
import { PipelineModule } from '../pipeline/pipeline.module.js';

import { ConsistencyService } from './services/consistency.service.js';
import { DocumentService } from './services/document.service.js';
import { ExplanationService } from './services/explanation.service.js';
import { LlmService } from './services/llm.service.js';
import { OcrService } from './services/ocr.service.js';
import { RiskService } from './services/risk.service.js';
import { RuleService } from './services/rule.service.js';
import { VisualSimilarityService } from './services/visual-similarity.service.js';

import { AssessmentTools } from './tools/assessment.tools.js';
import { ConsistencyVerificationTools } from './tools/consistency.tools.js';
import { DocumentVerificationTools } from './tools/document.tools.js';

@Module({
  name: 'verification',
  description:
    'PassportIQ verification stages (Backend A): document checklist, OCR extraction, ' +
    'identity/address consistency, the cited government rulebook, the weighted risk score, ' +
    'and the officer-readable explanation.',
  controllers: [DocumentVerificationTools, ConsistencyVerificationTools, AssessmentTools],
  providers: [
    // Order matters only for readability — the container resolves by dependency.
    LlmService, // optional LLM egress; degrades to deterministic when unset
    DocumentService, // stage 1
    OcrService, // stage 2
    ConsistencyService, // stages 3-4
    VisualSimilarityService, // optional stage
    RuleService, // stage 7 — the cited rulebook
    RiskService, // stage 8 — weighted 0-100 score
    ExplanationService, // stage 9 — deterministic recommendation, LLM narration
  ],
  imports: [PipelineModule],
  // The agent module plans over these stages and needs to read the same
  // rulebook, score and explanation the officer sees.
  exports: [RuleService, RiskService, ExplanationService, DocumentService, OcrService],
})
export class VerificationModule {}
