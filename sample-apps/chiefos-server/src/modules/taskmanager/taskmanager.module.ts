import { Module } from '@nitrostack/core';
import { TaskManagerTools } from './taskmanager.tools.js';
import { TaskManagerResources } from './taskmanager.resources.js';
import { TaskManagerPrompts } from './taskmanager.prompts.js';

@Module({
  name: 'taskmanager',
  description: 'TODO: Add description',
  controllers: [TaskManagerTools, TaskManagerResources, TaskManagerPrompts],
})
export class TaskManagerModule {}
