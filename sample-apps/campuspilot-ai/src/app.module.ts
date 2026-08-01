import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { AssignmentModule } from './modules/assignment/assignment.module.js';
import { TimetableModule } from './modules/timetable/timetable.module.js';
import { AttendanceModule } from './modules/attendance/attendance.module.js';
import { NotesModule } from './modules/notes/notes.module.js';
import { QuizModule } from './modules/quiz/quiz.module.js';
import { PlacementModule } from './modules/placement/placement.module.js';
import { StudyCoachModule } from './modules/studycoach/studycoach.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * CampusPilot AI – Root Application Module
 *
 * An autonomous academic assistant built with the NitroStack MCP SDK.
 * Powered by 6 specialized AI agents:
 *   - Assignment Agent  → tracks deadlines and pending work
 *   - Timetable Agent  → manages class schedule
 *   - Attendance Agent → calculates attendance and bunk safety
 *   - Notes Agent      → summarizes notes and explains topics
 *   - Quiz Agent       → generates MCQs, viva questions, flashcards
 *   - Placement Agent  → DSA roadmap and company-specific prep
 *
 * Standout Feature: Smart Study Coach
 *   → Proactively analyzes all academic data and generates a
 *     personalized daily study plan on session start (@InitialTool)
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'campuspilot-ai',
    version: '1.0.0',
  },
  logging: {
    level: 'info',
  },
})
@Module({
  name: 'app',
  description: 'CampusPilot AI – Autonomous Academic Assistant using MCP',
  imports: [
    ConfigModule.forRoot(),
    // Academic modules
    AssignmentModule,
    TimetableModule,
    AttendanceModule,
    NotesModule,
    QuizModule,
    PlacementModule,
    // Flagship feature
    StudyCoachModule,
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ],
})
export class AppModule {}
