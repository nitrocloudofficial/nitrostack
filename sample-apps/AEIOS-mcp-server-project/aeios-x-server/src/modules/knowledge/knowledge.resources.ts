import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { Blackboard } from './blackboard.js';
import { KnowledgeService } from './knowledge.service.js';

const blackboard = new Blackboard();
const knowledgeService = new KnowledgeService();

export class KnowledgeResources {
  @Resource({
    uri: 'aeios://knowledge/context',
    name: 'Knowledge Context',
    description: 'Current enterprise knowledge context from Blackboard entries',
    mimeType: 'text/markdown',
  })
  async getContext(uri: string, ctx: ExecutionContext) {
    const formatted = knowledgeService.formatContext(blackboard);
    return { contents: [{ uri, mimeType: 'text/markdown', text: formatted }] };
  }

  @Resource({
    uri: 'aeios://blackboard/entries',
    name: 'Blackboard Entries',
    description: 'All raw entries on the Enterprise Blackboard shared memory',
    mimeType: 'application/json',
  })
  async getEntries(uri: string, ctx: ExecutionContext) {
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({
          entries: blackboard.read(),
          summary: blackboard.summary(),
          categories: blackboard.categories(),
          total: blackboard.size,
        }, null, 2),
      }],
    };
  }
}
