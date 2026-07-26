import { Injectable, ResourceDecorator as Resource } from '@nitrostack/core';
import { Blackboard } from './blackboard.js';
import { KnowledgeService } from './knowledge.service.js';

@Injectable()
export class KnowledgeResources {
  private blackboard = new Blackboard();
  private knowledgeService = new KnowledgeService();

  @Resource({
    uri: 'aeios://knowledge/context',
    name: 'Knowledge Context',
    description: 'Current enterprise knowledge context built from all Blackboard entries',
    mimeType: 'text/markdown',
  })
  async getContext(uri: string, ctx: any) {
    const formatted = this.knowledgeService.formatContext(this.blackboard);
    return {
      contents: [
        {
          uri,
          mimeType: 'text/markdown',
          text: formatted,
        },
      ],
    };
  }

  @Resource({
    uri: 'aeios://blackboard/entries',
    name: 'Blackboard Entries',
    description: 'All raw entries on the Enterprise Blackboard shared memory',
    mimeType: 'application/json',
  })
  async getEntries(uri: string, ctx: any) {
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              entries: this.blackboard.read(),
              summary: this.blackboard.summary(),
              categories: this.blackboard.categories(),
              total: this.blackboard.size,
            },
            null,
            2
          ),
        },
      ],
    };
  }
}
