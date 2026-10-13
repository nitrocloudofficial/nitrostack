import { Module } from '@nitrostack/core';
import { ShoeService } from './services/shoe.service.js';
import { QuizTool } from './tools/quiz.tool.js';

@Module({
  name: 'shoes',
  description: 'Shoe recommendation engine with quiz-based matching',
  providers: [ShoeService],
  controllers: [QuizTool],
})
export class ShoesModule {}
