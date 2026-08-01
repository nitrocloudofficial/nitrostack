import { Module } from '@nitrostack/core';
import { JudgeLLMService }     from './judge-llm.service.js';
import { JudgePatternService } from './judge-pattern.service.js';
import { JudgesService }       from './judges.service.js';

/**
 * JudgesModule — Person C
 *
 * Provides:
 *   JudgeLLMService     — LLM judge (OpenAI/Anthropic/Ollama/mock), temperature=0
 *   JudgePatternService — Regex rules + Jaccard n-gram against calibration corpus
 *   JudgesService       — Dual-judge orchestration, disagreement flagging
 *
 * Note: This is a pure service library — no MCP tools exposed.
 * Consumed by OrchestratorModule (Person D) and its OrchestratorTools.
 */
@Module({
  name: 'judges',
  description: 'Dual-judge evaluation system: LLM judge + pattern judge (Person C)',
  providers: [JudgeLLMService, JudgePatternService, JudgesService],
  exports:   [JudgeLLMService, JudgePatternService, JudgesService],
})
export class JudgesModule {}
