import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';

const RESOURCES_PATH = path.join(process.cwd(), 'src', 'resources');

export class AttendanceResources {
  @Resource({
    uri: 'campuspilot://attendance',
    name: 'Student Attendance',
    description: 'Per-subject attendance records including total classes, attended classes, percentage, and bunk safety information for the student.',
    mimeType: 'application/json',
  })
  async getAttendanceData(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Serving attendance resource');

    const filePath = path.join(RESOURCES_PATH, 'attendance.json');
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
