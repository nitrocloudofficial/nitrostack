import { Module } from '@nitrostack/core';
import { GraphTools } from './graph.tools.js';
import { GraphService } from './graph.service.js';
import { LlmModule } from '../llm/llm.module.js';

@Module({
  name: 'graph',
  imports: [LlmModule],
  controllers: [GraphTools],
  providers: [GraphService],
  exports: [GraphService]
})
export class GraphModule {}
