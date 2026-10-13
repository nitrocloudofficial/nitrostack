import { ResourceDecorator as Resource, ExecutionContext, Injectable } from '@nitrostack/core';
import { ReadingListService } from './services/reading-list.service.js';

@Injectable({ deps: [ReadingListService] })
export class ReadingListResource {
  constructor(private readonly readingListService: ReadingListService) {}

  @Resource({
    uri: 'researchradar://reading-list',
    name: 'ResearchRadar Reading List',
    description:
      'Live Markdown of all arXiv papers saved using save_to_reading_list. ' +
      'AI reads this as structured context before generating reviews or pitches. ' +
      'Also includes commercialization potential notes if commercialize_research tool was used.',
    mimeType: 'text/markdown',
  })
  async getReadingList(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching reading list resource');

    const markdown = this.readingListService.toMarkdown();

    return {
      contents: [
        {
          uri,
          mimeType: 'text/markdown',
          text: markdown,
        },
      ],
    };
  }
}
