/**
 * MeetingMind Module
 * Registers all MeetingMind AI tools and services
 */

import { Module } from '@nitrostack/core';
import { MeetingMindTools } from './meetingmind.tools.js';
import { MeetingAnalyzerService } from '../../services/meeting-analyzer.service.js';

@Module({
  name: 'meetingmind',
  description: 'MeetingMind AI - Workplace meeting assistant with transcript analysis, task extraction, and dashboard',
  controllers: [MeetingMindTools],
  providers: [MeetingAnalyzerService]
})
export class MeetingMindModule {}
