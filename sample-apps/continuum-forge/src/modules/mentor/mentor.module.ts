import { Module } from '@nitrostack/core';
import { MentorTools } from './mentor.tools.js';

@Module({
  name: 'mentor',
  description: 'Provide coaching to junior operators',
  controllers: [MentorTools],
  exports: [MentorTools],
})
export class MentorModule {}
