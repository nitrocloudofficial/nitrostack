import { Module } from '@nitrostack/core';
import { AdminTools } from './admin.tools.js';
import { AdminResources } from './admin.resources.js';

@Module({
  name: 'admin',
  description: 'Admin requests module',
  controllers: [AdminTools, AdminResources]
})
export class AdminModule {}
