import { Module } from '@nitrostack/core';
import { TutorService } from './tutor.service.js';
import { TutorTools } from './tutor.tools.js';

@Module({
    name: 'tutor',
    description: 'AI Tutor module - provides personalized learning tools including lessons, quizzes, and progress tracking',
    controllers: [TutorTools],
    providers: [TutorService],
})
export class TutorModule { }
