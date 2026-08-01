import { Module } from '@nitrostack/core';
import { ResumeTools } from './resume.tools.js';
import { DatabaseModule } from '../database/database.module.js';
import { AiModule } from '../ai/ai.module.js';

@Module({
  name: 'resume',
  imports: [DatabaseModule, AiModule],
  controllers: [ResumeTools],
})
export class ResumeModule {}
