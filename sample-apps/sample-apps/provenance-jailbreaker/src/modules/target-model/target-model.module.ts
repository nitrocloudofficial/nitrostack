import { Module } from '@nitrostack/core';
import { TargetModelService } from './target-model.service.js';
import { TargetModelTools }   from './target-model.tools.js';

/**
 * TargetModelModule — Person A
 *
 * Provides:
 *   TargetModelService — Ollama HTTP wrapper (v1: phi3:mini, v2: qwen2.5:3b)
 *
 * Exposes MCP tools:
 *   test_target_model_v1   — send adversarial prompt to v1, get response
 *   test_target_model_v2   — send adversarial prompt to v2, get response
 *   target_model_health    — verify Ollama is reachable and models are pulled
 */
@Module({
  name: 'target-model',
  description: 'Ollama-backed target model infrastructure for red-teaming (Person A)',
  controllers: [TargetModelTools],
  providers:   [TargetModelService],
  exports:     [TargetModelService],
})
export class TargetModelModule {}
