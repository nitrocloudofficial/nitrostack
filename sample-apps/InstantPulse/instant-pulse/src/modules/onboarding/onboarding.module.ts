import { Module } from '@nitrostack/core';
import { CommonModule } from '../../common/common.module.js';
import { OnboardingPrompts } from './onboarding.prompts.js';
import { OnboardingResources } from './onboarding.resources.js';
import { OnboardingTools } from './onboarding.tools.js';

@Module({
  name: 'onboarding',
  description: 'Application lifecycle, decision reports, glossary and narration prompts',
  imports: [CommonModule],
  controllers: [OnboardingTools, OnboardingResources, OnboardingPrompts],
})
export class OnboardingModule {}
