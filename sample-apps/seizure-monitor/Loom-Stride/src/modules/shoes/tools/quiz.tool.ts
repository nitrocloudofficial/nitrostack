import {
  ToolDecorator as Tool,
  ControllerDecorator as Controller,
  ExecutionContext,
  z,
} from '@nitrostack/core';
import { ShoeService } from '../services/shoe.service.js';
import { QuizAnswersSchema } from '../schemas/shoe.schema.js';

@Controller('shoes')
export class QuizTool {
  constructor(private shoeService: ShoeService) {}

  @Tool({
    name: 'submit_quiz',
    description: 'Submit shoe preference quiz answers to get personalized recommendations',
    inputSchema: QuizAnswersSchema,
  })
  async submitQuiz(answers: z.infer<typeof QuizAnswersSchema>, ctx: ExecutionContext) {
    ctx.logger.info('Quiz submitted', { answers });

    const filteredShoes = this.shoeService.searchShoes(answers);
    const scoredShoes = this.shoeService.scoreShoes(answers, filteredShoes);

    const topRecommendations = scoredShoes.slice(0, 5).map((item) => ({
      itemNo: item.shoe.itemNo,
      brand: item.shoe.brand,
      model: item.shoe.model,
      imageUrl: item.shoe.imageUrl,
      matchingPercentage: item.score,
      reasons: item.reasons,
    }));

    return {
      success: true,
      quizId: `quiz_${Date.now()}`,
      recommendations: topRecommendations,
      totalMatches: scoredShoes.length,
    };
  }
}

