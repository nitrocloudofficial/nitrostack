import { Module } from '@nitrostack/core';
import { SourcingTools } from './sourcing.tools.js';

@Module({
  name: 'SourcingModule',
  controllers: [SourcingTools],
  providers: [SourcingTools],
  exports: [SourcingTools],
})
export class SourcingModule {}
