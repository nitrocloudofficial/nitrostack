import { Module } from '@nitrostack/core';
import { CalculatorTools } from './calculator.tools.js';
import { CalculatorResources } from './calculator.resources.js';
import { CalculatorPrompts } from './calculator.prompts.js';

@Module({
  name: 'Aegispay',
  description: 'Compliance-gated payment rail for AI agents',
  controllers: [CalculatorTools, CalculatorResources, CalculatorPrompts]
})
export class AegispayModule { }
