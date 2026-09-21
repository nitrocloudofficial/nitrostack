import { Module } from '@nitrostack/core';
import { PredictorCredibilityTools }  from './predictor-credibility.tools.js';
import { PredictorProfilesResources } from './predictor-profiles.resource.js';

@Module({
  name: 'predictor-credibility',
  description:
    'Phase 2 — Predictor Credibility Agent: Fetches social profile stats (Twitter/X, YouTube), ' +
    'extracts past stock predictions from posts via Groq LLaMA, backtests them with Yahoo Finance ' +
    'historical prices, and scores the predictor (predictor_score 0–25, platform_score 0–10). ' +
    'Owns and writes to video://predictor-profiles Resource.',
  controllers: [PredictorCredibilityTools, PredictorProfilesResources],
})
export class PredictorCredibilityModule {}
