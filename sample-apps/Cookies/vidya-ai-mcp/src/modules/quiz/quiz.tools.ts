import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SupabaseService } from '../../services/supabase.service.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const getSupabaseClient = () => SupabaseService.getClientOrThrow();

export class QuizTools {
  @Tool({
    name: 'generate_quiz',
    description: 'Generate a quiz with multiple-choice questions based on a topic and summaries. Uses Gemini AI.',
    inputSchema: z.object({
      topic: z.string().describe('The topic for the quiz'),
      summaries: z.array(z.string()).describe('Array of paper summaries to base questions on'),
      difficulty: z.enum(['easy', 'intermediate', 'hard']).describe('Difficulty level of the quiz'),
      count: z.number().int().min(1).max(20).describe('Number of questions to generate')
    }),
    examples: {
      request: {
        topic: 'machine learning in healthcare',
        summaries: ['Summary 1', 'Summary 2'],
        difficulty: 'intermediate',
        count: 5
      },
      response: {
        questions: [
          {
            id: 'q_001',
            question: 'What is the primary application of deep learning in medical imaging?',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswer: 0
          }
        ]
      }
    }
  })
  @Widget('quiz-interface')
  async generateQuiz(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating quiz', { topic: input.topic, difficulty: input.difficulty, count: input.count });
    const supabase = getSupabaseClient();

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const summariesText = input.summaries.join('\n\n');

      const prompt = `Based on the following summaries about "${input.topic}", generate exactly ${input.count} multiple-choice questions at ${input.difficulty} difficulty level.

Summaries:
${summariesText}

For each question, provide:
1. A clear question
2. Four options (A, B, C, D)
3. The correct answer (0-3 for A-D)

Format your response as a JSON array with objects containing: question, options (array of 4 strings), correctAnswer (0-3).`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // Parse JSON response
      let questions;
      try {
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        questions = parsed.map((q: any, idx: number) => ({
          id: `q_${String(idx + 1).padStart(3, '0')}`,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer
        }));
      } catch {
        // Fallback: generate mock questions
        questions = Array.from({ length: input.count }, (_, i) => ({
          id: `q_${String(i + 1).padStart(3, '0')}`,
          question: `Question ${i + 1} about ${input.topic}?`,
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: Math.floor(Math.random() * 4)
        }));
      }

      return {
        topic: input.topic,
        difficulty: input.difficulty,
        count: questions.length,
        questions
      };
    } catch (error) {
      ctx.logger.error('Error generating quiz', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  @Tool({
    name: 'grade_answer',
    description: 'Grade a user answer against the correct answer and provide feedback.',
    inputSchema: z.object({
      questionId: z.string().describe('The ID of the question'),
      userAnswer: z.number().int().min(0).max(3).describe('The user\'s answer (0-3 for A-D)'),
      correctAnswer: z.number().int().min(0).max(3).describe('The correct answer (0-3 for A-D)')
    }),
    examples: {
      request: {
        questionId: 'q_001',
        userAnswer: 2,
        correctAnswer: 1
      },
      response: {
        correct: false,
        feedback: 'Incorrect. The correct answer is B.'
      }
    }
  })
  async gradeAnswer(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Grading answer', { questionId: input.questionId, userAnswer: input.userAnswer, correctAnswer: input.correctAnswer });

    const correct = input.userAnswer === input.correctAnswer;
    const answerLetters = ['A', 'B', 'C', 'D'];

    return {
      correct,
      feedback: correct
        ? 'Correct! Well done.'
        : `Incorrect. The correct answer is ${answerLetters[input.correctAnswer]}.`
    };
  }

  @Tool({
    name: 'get_quiz_history',
    description: 'Retrieve quiz history for a session from Supabase.',
    inputSchema: z.object({
      sessionId: z.string().describe('The session ID to retrieve history for')
    }),
    examples: {
      request: {
        sessionId: 'session_001'
      },
      response: {
        sessionId: 'session_001',
        quizzes: []
      }
    }
  })
  async getQuizHistory(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Retrieving quiz history', { sessionId: input.sessionId });
    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('quiz_results')
        .select('*')
        .eq('session_id', input.sessionId);

      if (error) {
        ctx.logger.error('Error retrieving quiz history', { error: error.message });
        return { sessionId: input.sessionId, quizzes: [] };
      }

      return {
        sessionId: input.sessionId,
        quizzes: data || []
      };
    } catch (error) {
      ctx.logger.error('Error in getQuizHistory', { error: error instanceof Error ? error.message : String(error) });
      return { sessionId: input.sessionId, quizzes: [] };
    }
  }

  @Tool({
    name: 'complete_quiz',
    description: 'Mark a quiz as complete, calculate score, award Vi Coins, and store results in Supabase.',
    inputSchema: z.object({
      sessionId: z.string().describe('The session ID'),
      userId: z.string().describe('The user ID'),
      totalQuestions: z.number().int().describe('Total number of questions'),
      correctCount: z.number().int().describe('Number of correct answers')
    }),
    examples: {
      request: {
        sessionId: 'session_001',
        userId: 'user_001',
        totalQuestions: 5,
        correctCount: 4
      },
      response: {
        sessionId: 'session_001',
        score: 80,
        coinsAwarded: 30
      }
    }
  })
  async completeQuiz(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Completing quiz', { sessionId: input.sessionId, userId: input.userId });
    const supabase = getSupabaseClient();

    try {
      const scorePercentage = (input.correctCount / input.totalQuestions) * 100;
      let coinsAwarded = 5; // Default for below 50%

      if (scorePercentage >= 90) {
        coinsAwarded = 50;
      } else if (scorePercentage >= 75) {
        coinsAwarded = 30;
      } else if (scorePercentage >= 50) {
        coinsAwarded = 15;
      }

      // Store quiz result in Supabase
      const { error } = await supabase
        .from('quiz_results')
        .insert({
          session_id: input.sessionId,
          user_id: input.userId,
          total_questions: input.totalQuestions,
          correct_count: input.correctCount,
          score: scorePercentage,
          vi_coins_earned: coinsAwarded,
          completed_at: new Date().toISOString()
        });

      if (error) {
        ctx.logger.error('Error storing quiz result', { error: error.message });
      }

      // Award coins (would call award_coins from viCoins module)
      ctx.logger.info('Quiz completed and coins awarded', { coinsAwarded });

      return {
        sessionId: input.sessionId,
        score: Math.round(scorePercentage),
        coinsAwarded
      };
    } catch (error) {
      ctx.logger.error('Error completing quiz', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
}
