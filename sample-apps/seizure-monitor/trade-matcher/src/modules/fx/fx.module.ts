import { Module } from '@nitrostack/core';
import { FxTools } from './fx.tools.js';

@Module({
  name: 'fx',
  description: 'Mock FX rate lookups for reconciliation investigation',
  controllers: [FxTools],
})
export class FxModule {}