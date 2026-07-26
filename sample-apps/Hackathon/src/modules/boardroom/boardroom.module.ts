import { Module } from '@nitrostack/core';
import { BoardroomTools } from './boardroom.tools.js';
import { BoardroomPrompts } from './boardroom.prompts.js';

@Module({
  name: 'boardroom',
  description: 'Strategic decision-making tools and prompts for the executive boardroom',
  controllers: [BoardroomTools, BoardroomPrompts]
})
export class BoardroomModule {}
