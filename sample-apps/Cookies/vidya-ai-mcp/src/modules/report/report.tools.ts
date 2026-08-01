import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { SupabaseService } from '../../services/supabase.service.js';

const getSupabaseClient = () => SupabaseService.getClientOrThrow();

export class ReportTools {
  @Tool({
    name: 'generate_report',
    description: 'Generate a consolidated report of all learning activities for a session (research, quiz, lecture, chat, coins).',
    inputSchema: z.object({
      sessionId: z.string().describe('The session ID to generate report for'),
      userId: z.string().describe('The user ID')
    }),
    examples: {
      request: {
        sessionId: 'session_001',
        userId: 'user_001'
      },
      response: {
        sessionId: 'session_001',
        summary: {
          papersReviewed: 5,
          quizScore: 80,
          lectureCompleted: true,
          coinsEarned: 50
        }
      }
    }
  })
  async generateReport(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating report', { sessionId: input.sessionId, userId: input.userId });
    const supabase = getSupabaseClient();

    try {
      // Fetch research data
      const { data: researchData } = await supabase
        .from('research_sessions')
        .select('*')
        .eq('id', input.sessionId)
        .single();

      // Fetch papers
      const { data: papersData } = await supabase
        .from('papers')
        .select('*')
        .eq('session_id', input.sessionId);

      // Fetch quiz results
      const { data: quizData } = await supabase
        .from('quiz_results')
        .select('*')
        .eq('session_id', input.sessionId)
        .single();

      // Fetch lecture scripts
      const { data: lectureData } = await supabase
        .from('lecture_scripts')
        .select('*')
        .eq('session_id', input.sessionId)
        .single();

      // Fetch chat history
      const { data: chatData } = await supabase
        .from('chat_history')
        .select('*')
        .eq('session_id', input.sessionId);

      // Fetch user coins
      const { data: coinsData } = await supabase
        .from('user_coins')
        .select('*')
        .eq('user_id', input.userId)
        .single();

      return {
        sessionId: input.sessionId,
        userId: input.userId,
        summary: {
          topic: researchData?.topic || 'Unknown',
          papersReviewed: papersData?.length || 0,
          quizScore: quizData?.score || 0,
          quizCoinsEarned: quizData?.vi_coins_earned || 0,
          lectureCompleted: !!lectureData,
          chatMessagesCount: chatData?.length || 0,
          totalCoinsEarned: coinsData?.total_coins || 0,
          currentStreak: coinsData?.current_streak || 0
        },
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      ctx.logger.error('Error generating report', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
}
