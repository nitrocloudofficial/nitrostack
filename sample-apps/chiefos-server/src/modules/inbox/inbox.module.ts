import { Module } from '@nitrostack/core';
import { InboxService } from './inbox.service.js';
import { InboxController } from './inbox.controller.js';

/**
 * InboxModule
 * 
 * Message and notification aggregation module for ChiefOS.
 * Handles inbox organization, filtering, and prioritization across multiple sources.
 */
@Module({
  name: 'inbox',
  description: 'ChiefOS message and notification aggregation module',
  controllers: [InboxController],
  providers: [InboxService],
})
export class InboxModule {}
