import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';

const RESOURCES_PATH = path.join(process.cwd(), 'src', 'resources');

export class TimetableResources {
  @Resource({
    uri: 'campuspilot://timetable',
    name: 'Student Timetable',
    description: 'Complete weekly class schedule for the student including subject, room, faculty, and period timings for all days of the week.',
    mimeType: 'application/json',
  })
  async getTimetableData(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Serving timetable resource');

    const filePath = path.join(RESOURCES_PATH, 'timetable.json');
    const raw = fs.readFileSync(filePath, 'utf-8');

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: raw,
        },
      ],
    };
  }
}
