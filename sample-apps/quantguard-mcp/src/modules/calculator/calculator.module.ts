import { Module } from '@nitrostack/core';
import { CalculatorTools } from './calculator.tools.js';
import { CalculatorResources } from './calculator.resources.js';
import { CalculatorPrompts } from './calculator.prompts.js';

@Module({
  name: 'calculator',
  description: 'Basic arithmetic calculator',
  controllers: [CalculatorTools, CalculatorResources, CalculatorPrompts]
})
export class CalculatorModule {}

