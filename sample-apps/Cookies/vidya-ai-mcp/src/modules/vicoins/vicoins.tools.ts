import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { SupabaseService } from '../../services/supabase.service.js';

const getSupabaseClient = () => SupabaseService.getClientOrThrow();

export class ViCoinsTools {
  @Tool({
    name: 'award_coins',
    description: 'Award Vi Coins to a user and update streak. Internal function used by quiz, tasks, and pomodoro.',
    inputSchema: z.object({
      userId: z.string().describe('The user ID'),
      amount: z.number().int().min(1).describe('Number of coins to award'),
      source: z.enum(['quiz', 'task', 'pomodoro']).describe('Source of the coin award')
    }),
    examples: {
      request: {
        userId: 'user_001',
        amount: 50,
        source: 'quiz'
      },
      response: {
        userId: 'user_001',
        coinsAwarded: 50,
        totalCoins: 150,
        streak: 5
      }
    }
  })
  async awardCoins(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Awarding coins', { userId: input.userId, amount: input.amount, source: input.source });
    const supabase = getSupabaseClient();

    try {
      const today = new Date().toISOString().split('T')[0];

      // Get current user coins
      const { data: userData, error: fetchError } = await supabase
        .from('user_coins')
        .select('*')
        .eq('user_id', input.userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        ctx.logger.error('Error fetching user coins', { error: fetchError.message });
        throw fetchError;
      }

      let newTotalCoins = input.amount;
      let newStreak = 1;

      if (userData) {
        newTotalCoins = userData.total_coins + input.amount;

        // Update streak logic
        const lastActiveDate = userData.last_active_date;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastActiveDate === today) {
          // Already active today, keep streak
          newStreak = userData.current_streak;
        } else if (lastActiveDate === yesterdayStr) {
          // Active yesterday, increment streak
          newStreak = userData.current_streak + 1;
        } else {
          // Gap in activity, reset to 1
          newStreak = 1;
        }

        // Update existing record
        const { error: updateError } = await supabase
          .from('user_coins')
          .update({
            total_coins: newTotalCoins,
            current_streak: newStreak,
            last_active_date: today
          })
          .eq('user_id', input.userId);

        if (updateError) {
          ctx.logger.error('Error updating user coins', { error: updateError.message });
          throw updateError;
        }
      } else {
        // Create new record
        const { error: insertError } = await supabase
          .from('user_coins')
          .insert({
            user_id: input.userId,
            username: `user_${input.userId}`,
            total_coins: newTotalCoins,
            current_streak: 1,
            last_active_date: today
          });

        if (insertError) {
          ctx.logger.error('Error creating user coins record', { error: insertError.message });
          throw insertError;
        }
      }

      return {
        userId: input.userId,
        coinsAwarded: input.amount,
        totalCoins: newTotalCoins,
        streak: newStreak,
        source: input.source
      };
    } catch (error) {
      ctx.logger.error('Error awarding coins', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  @Tool({
    name: 'start_pomodoro_session',
    description: 'Start a 25-minute Pomodoro focus session.',
    inputSchema: z.object({
      userId: z.string().describe('The user ID'),
      taskId: z.string().describe('The task ID to focus on')
    }),
    examples: {
      request: {
        userId: 'user_001',
        taskId: 'task_001'
      },
      response: {
        sessionId: 'pom_001',
        userId: 'user_001',
        taskId: 'task_001',
        durationMinutes: 25,
        startedAt: '2024-01-01T10:00:00Z'
      }
    }
  })
  async startPomodoroSession(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Starting Pomodoro session', { userId: input.userId, taskId: input.taskId });
    const supabase = getSupabaseClient();

    try {
      const sessionId = `pom_${Date.now()}`;
      const startedAt = new Date().toISOString();

      const { error } = await supabase
        .from('pomodoro_sessions')
        .insert({
          id: sessionId,
          user_id: input.userId,
          task_id: input.taskId,
          started_at: startedAt,
          minutes: 0,
          vi_coins_earned: 0
        });

      if (error) {
        ctx.logger.error('Error starting Pomodoro session', { error: error.message });
        throw error;
      }

      return {
        sessionId,
        userId: input.userId,
        taskId: input.taskId,
        durationMinutes: 25,
        startedAt
      };
    } catch (error) {
      ctx.logger.error('Error in startPomodoroSession', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  @Tool({
    name: 'end_pomodoro_session',
    description: 'End a Pomodoro session, calculate coins earned (1 coin per minute, minimum 10 minutes), and award coins.',
    inputSchema: z.object({
      sessionId: z.string().describe('The Pomodoro session ID'),
      minutesCompleted: z.number().int().min(0).describe('Number of minutes completed')
    }),
    examples: {
      request: {
        sessionId: 'pom_001',
        minutesCompleted: 25
      },
      response: {
        sessionId: 'pom_001',
        minutesCompleted: 25,
        coinsEarned: 25
      }
    }
  })
  async endPomodoroSession(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Ending Pomodoro session', { sessionId: input.sessionId, minutesCompleted: input.minutesCompleted });
    const supabase = getSupabaseClient();

    try {
      // Calculate coins: 1 coin per minute, minimum 10 minutes to earn
      const coinsEarned = input.minutesCompleted >= 10 ? input.minutesCompleted : 0;

      // Update session
      const { error: updateError } = await supabase
        .from('pomodoro_sessions')
        .update({
          minutes: input.minutesCompleted,
          vi_coins_earned: coinsEarned
        })
        .eq('id', input.sessionId);

      if (updateError) {
        ctx.logger.error('Error updating Pomodoro session', { error: updateError.message });
        throw updateError;
      }

      // Get user ID from session
      const { data: sessionData, error: fetchError } = await supabase
        .from('pomodoro_sessions')
        .select('user_id')
        .eq('id', input.sessionId)
        .single();

      if (fetchError || !sessionData) {
        ctx.logger.error('Error fetching session user', { error: fetchError?.message });
        throw new Error('Session not found');
      }

      // Award coins if earned
      if (coinsEarned > 0) {
        await this.awardCoins(
          { userId: sessionData.user_id, amount: coinsEarned, source: 'pomodoro' },
          ctx
        );
      }

      return {
        sessionId: input.sessionId,
        minutesCompleted: input.minutesCompleted,
        coinsEarned
      };
    } catch (error) {
      ctx.logger.error('Error ending Pomodoro session', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  @Tool({
    name: 'get_user_coins',
    description: 'Get the current Vi Coins balance and streak for a user.',
    inputSchema: z.object({
      userId: z.string().describe('The user ID')
    }),
    examples: {
      request: {
        userId: 'user_001'
      },
      response: {
        userId: 'user_001',
        totalCoins: 150,
        currentStreak: 5
      }
    }
  })
  async getUserCoins(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Getting user coins', { userId: input.userId });
    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('user_coins')
        .select('*')
        .eq('user_id', input.userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        ctx.logger.error('Error fetching user coins', { error: error.message });
        throw error;
      }

      return {
        userId: input.userId,
        totalCoins: data?.total_coins || 0,
        currentStreak: data?.current_streak || 0,
        lastActiveDate: data?.last_active_date || null
      };
    } catch (error) {
      ctx.logger.error('Error in getUserCoins', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  @Tool({
    name: 'get_leaderboard',
    description: 'Get the top users by Vi Coins earned.',
    inputSchema: z.object({
      limit: z.number().int().min(1).max(100).describe('Number of top users to return')
    }),
    examples: {
      request: {
        limit: 10
      },
      response: {
        leaderboard: [
          { rank: 1, userId: 'user_001', totalCoins: 500, currentStreak: 10 }
        ]
      }
    }
  })
  async getLeaderboard(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Getting leaderboard', { limit: input.limit });
    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('user_coins')
        .select('*')
        .order('total_coins', { ascending: false })
        .limit(input.limit);

      if (error) {
        ctx.logger.error('Error fetching leaderboard', { error: error.message });
        throw error;
      }

      const leaderboard = (data || []).map((user: any, idx: number) => ({
        rank: idx + 1,
        userId: user.user_id,
        username: user.username,
        totalCoins: user.total_coins,
        currentStreak: user.current_streak
      }));

      return {
        leaderboard,
        count: leaderboard.length
      };
    } catch (error) {
      ctx.logger.error('Error in getLeaderboard', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
}
