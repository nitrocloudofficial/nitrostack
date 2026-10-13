import { Module } from '@nitrostack/core';
import { StudentTools } from './student.tools.js';

/** Student Model — Loop 1 agents + Compass. FACULTY BLOCKED (beat 6). */
@Module({
  name: 'student',
  description: 'Student Model server: reflections, diagnoses, individual mastery',
  controllers: [StudentTools],
})
export class StudentModule {}
