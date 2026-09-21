import { Module } from '@nitrostack/core';
import { EngineeringTools } from './engineering.tools.js';
import { EngineeringResources } from './engineering.resources.js';
import { EngineeringPrompts } from './engineering.prompts.js';

@Module({
  name: 'engineering',
  description: 'Engineering review agent for business proposals',
  controllers: [EngineeringTools, EngineeringResources, EngineeringPrompts]
})
export class EngineeringModule {}
