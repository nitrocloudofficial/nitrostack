import { Module } from '@nitrostack/core';
import { ViCoinsTools } from './vicoins.tools.js';

@Module({
  name: 'vicoins',
  description: 'Vi Coins reward system and Pomodoro sessions',
  controllers: [ViCoinsTools]
})
export class ViCoinsModule {}
