/**
 * CampusPilot AI – Autonomous Academic Assistant using MCP
 *
 * Main entry point for the CampusPilot AI MCP server.
 * Built with NitroStack TypeScript SDK and Model Context Protocol.
 *
 * Agents:
 *   🎓 Assignment Agent  – Tracks deadlines and pending assignments
 *   📅 Timetable Agent   – Manages class schedules
 *   📊 Attendance Agent  – Calculates attendance and bunk safety
 *   📚 Notes Agent       – Summarizes notes and explains topics
 *   🧪 Quiz Agent        – Generates MCQs, viva questions, flashcards
 *   💼 Placement Agent   – DSA roadmap and interview prep
 *   🧠 Smart Study Coach – Proactive daily study plan (flagship feature)
 *
 * Transport Configuration:
 * - Development (NODE_ENV=development): STDIO only
 * - Production (NODE_ENV=production): Dual transport (STDIO + HTTP SSE)
 */

import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

/**
 * Bootstrap the application
 */
async function bootstrap() {
  // Create and start the MCP server
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
}

// Start the application
bootstrap().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
