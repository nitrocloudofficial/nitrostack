import { Module } from '@nitrostack/core';
import { QuizTools } from './quiz.tools.js';
import { QuizPrompts } from './quiz.prompts.js';

@Module({
  name: 'quiz',
  description: 'Quiz generator: MCQs, viva questions, and flashcards for exam preparation and placement',
  controllers: [QuizTools, QuizPrompts],
})
export class QuizModule {}
