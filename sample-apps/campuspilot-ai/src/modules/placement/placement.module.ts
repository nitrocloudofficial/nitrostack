import { Module } from '@nitrostack/core';
import { PlacementTools } from './placement.tools.js';
import { PlacementResources } from './placement.resources.js';
import { PlacementPrompts } from './placement.prompts.js';

@Module({
  name: 'placement',
  description: 'Placement preparation agent: DSA roadmap, company-specific interview prep, and resume guidance',
  controllers: [PlacementTools, PlacementResources, PlacementPrompts],
})
export class PlacementModule {}
