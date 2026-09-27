import { Module } from '@nitrostack/core';
import { ReviewsTools } from './reviews.tools.js';
import { ReviewsResources } from './reviews.resources.js';
import { ReviewsPrompts } from './reviews.prompts.js';
import { DatabaseService } from '../../lib/database.service.js';

@Module({
  name: 'reviews',
  description: 'Review submission, CRUD, and management',
  controllers: [ReviewsTools, ReviewsResources, ReviewsPrompts],
  providers: [DatabaseService],
})
export class ReviewsModule {}
