import { Module } from '@nitrostack/core';
import { NewsService } from './news.service.js';
import { NewsResource } from './news.resource.js';
import { DbModule } from '../db/db.module.js';

/**
 * NewsModule — financial news and macro events
 */
@Module({
  name: 'news',
  description: 'News providers, economic calendars, and NLP sentiment analysis',
  imports: [DbModule],
  providers: [NewsService],
  controllers: [NewsResource],
  exports: [NewsService, NewsResource]
})
export class NewsModule {}
