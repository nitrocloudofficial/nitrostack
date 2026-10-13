import { Module } from '@nitrostack/core';
import { FoundryTools } from './foundry.tools.js';
import { DatabaseModule } from '../database/database.module.js';
import { AiModule } from '../ai/ai.module.js';

@Module({
  name: 'foundry',
  imports: [DatabaseModule, AiModule],
  controllers: [FoundryTools],
})
export class FoundryModule {}
