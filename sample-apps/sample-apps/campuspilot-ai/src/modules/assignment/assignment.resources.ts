import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';

const RESOURCES_PATH = path.join(process.cwd(), 'src', 'resources');

export class AssignmentResources {
  @Resource({
    uri: 'campuspilot://assignments',
    name: 'Student Assignments',
    description: 'Complete assignment list for the student including pending, in-progress, and completed assignments with due dates, priorities, and subject details.',
    mimeType: 'application/json',
  })
  async getAssignmentData(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Serving assignment resource');

    const filePath = path.join(RESOURCES_PATH, 'assignments.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
}
