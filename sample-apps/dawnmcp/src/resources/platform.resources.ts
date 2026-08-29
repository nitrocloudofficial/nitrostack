import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { MemoryService } from '../modules/memory/memory.service.js';
import { DocumentService } from '../modules/documents/document.service.js';

export class PlatformResources {
  constructor(
    private readonly memoryService: MemoryService,
    private readonly documentService: DocumentService,
  ) {}

  @Resource({
    uri: 'project://context',
    name: 'Project Context',
    description: 'Current project context and key architectural decisions.',
    mimeType: 'application/json',
  })
  async getProjectContext(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching project context resource');

    const projectMemories = await this.memoryService.getMemoriesByCategory('project_info');
    const decisions = await this.memoryService.getMemoriesByCategory('technical_decisions');

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              projectInfo: projectMemories.map((m) => ({ id: m.id, content: m.content })),
              technicalDecisions: decisions.map((m) => ({ id: m.id, content: m.content })),
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  @Resource({
    uri: 'documents://available',
    name: 'Available Documents',
    description: 'List of all indexed project documentation and specs.',
    mimeType: 'application/json',
  })
  async getAvailableDocuments(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching available documents resource');

    const docs = await this.documentService.listDocuments();

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              totalDocuments: docs.length,
              documents: docs.map((d) => ({
                id: d.id,
                title: d.title,
                category: d.category,
                createdAt: d.createdAt,
              })),
            },
            null,
            2,
          ),
        },
      ],
    };
  }
}
