import { Module } from '@nitrostack/core';
import { DebateTools } from './debate.tools.js';

@Module({
  name: 'debate',
  description: 'Debate module for cross-agent challenge exchanges and estimate reconciliation',
  controllers: [DebateTools]
})
export class DebateModule {}
