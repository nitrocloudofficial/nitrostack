import { Module } from '@nitrostack/core';
import { ContentTools } from './content.tools.js';

/** Course Content — read-only, all roles. foray_plan.md §3.1 */
@Module({
  name: 'content',
  description: 'Course Content server: concepts, prerequisites, prescribed material',
  controllers: [ContentTools],
})
export class ContentModule {}
