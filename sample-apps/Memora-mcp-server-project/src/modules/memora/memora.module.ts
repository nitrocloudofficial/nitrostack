import { Module } from '@nitrostack/core';
import { DocumentsController } from './controllers/documents.controller.js';
import { CoursesController } from './controllers/courses.controller.js';
import { AnalyticsController } from './controllers/analytics.controller.js';
import { StudyController } from './controllers/study.controller.js';
import { SearchController } from './controllers/search.controller.js';

@Module({
    name: 'memora',
    description: 'Autonomous study platform integrating LlamaParse and Supabase',
    controllers: [
        DocumentsController,
        CoursesController,
        AnalyticsController,
        StudyController,
        SearchController
    ]
})
export class MemoraModule { }
