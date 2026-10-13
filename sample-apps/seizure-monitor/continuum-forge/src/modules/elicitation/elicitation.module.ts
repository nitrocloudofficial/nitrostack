import { Module } from '@nitrostack/core';
import { ElicitationTools } from './elicitation.tools.js';

@Module({
  name: 'elicitation',
  description: 'Gather tacit knowledge from domain experts',
  controllers: [ElicitationTools],
  exports: [ElicitationTools],
})
export class ElicitationModule {}
