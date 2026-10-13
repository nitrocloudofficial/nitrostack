import { Module } from '@nitrostack/core';
import { ResolveTools } from './resolve.tools.js';

@Module({
  name: 'resolve',
  description: 'Resolve or escalate investigated breaks, and track accuracy stats',
  controllers: [ResolveTools],
})
export class ResolveModule {}