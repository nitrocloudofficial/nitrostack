import { Module } from '@nitrostack/core';
import { ExplainTools } from './explain.tools.js';

@Module({
  name: 'explain',
  description: 'Explain financial concepts',
  controllers: [ExplainTools]
})
export class ExplainModule {}
