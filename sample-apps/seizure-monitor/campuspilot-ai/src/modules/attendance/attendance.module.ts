import { Module } from '@nitrostack/core';
import { AttendanceTools } from './attendance.tools.js';
import { AttendanceResources } from './attendance.resources.js';
import { AttendancePrompts } from './attendance.prompts.js';

@Module({
  name: 'attendance',
  description: 'Attendance tracking, percentage calculation, and bunk safety prediction agent',
  controllers: [AttendanceTools, AttendanceResources, AttendancePrompts],
})
export class AttendanceModule {}
