import { Module } from '@nitrostack/core';
import { QuizTools } from './quiz.tools.js';

@Module({
  name: 'quiz',
  description: 'Quiz generation, grading, and result tracking',
  controllers: [QuizTools]
})
export class QuizModule {}
