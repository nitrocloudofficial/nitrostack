import { Module } from '@nitrostack/core';
import { RubricEvaluatorTools } from './rubric-evaluator.tools.js';
import { RubricEvaluatorPrompts } from './rubric-evaluator.prompts.js';

@Module({
  name: 'rubric-evaluator',
  description: 'Evaluates hackathon submissions against rubric criteria',
  controllers: [RubricEvaluatorTools, RubricEvaluatorPrompts]
})
export class RubricEvaluatorModule {}
