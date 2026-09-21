import { Module } from '@nitrostack/core';
import { LectureTools } from './lecture.tools.js';

@Module({
  name: 'lecture',
  description: 'Lecture script generation for educational content',
  controllers: [LectureTools]
})
export class LectureModule {}
