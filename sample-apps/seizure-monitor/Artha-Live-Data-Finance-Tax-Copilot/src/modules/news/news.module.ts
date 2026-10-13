import { Module } from '@nitrostack/core';
import { NewsService } from './news.service.js';
import { NewsTools } from './news.tools.js';

/**
 * News module — market news & events from the provided CSV dataset
 * (tools + a recent-events resource). Data is parsed once at startup.
 */
@Module({
    name: 'news',
    description: 'Market news & events (dataset-backed): search, sentiment summary, recent-events resource',
    controllers: [NewsTools],
    providers: [NewsService],
    exports: [NewsService],
})
export class NewsModule { }
