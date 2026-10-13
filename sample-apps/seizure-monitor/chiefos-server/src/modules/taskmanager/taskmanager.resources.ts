import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';

/**
 * TaskManager Resources
 * 
 * TODO: Add description
 */
export class TaskManagerResources {
  @Resource({
    uri: 'taskmanager://example',
    name: 'Example Resource',
    description: 'TODO: Add description',
    mimeType: 'application/json',
  })
  async exampleResource(context: ExecutionContext) {
    // TODO: Implement resource logic
    return {
      type: 'text' as const,
      text: JSON.stringify({ example: 'data' }, null, 2),
    };
  }
}
