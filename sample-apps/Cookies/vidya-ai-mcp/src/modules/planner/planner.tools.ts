import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SupabaseService } from '../../services/supabase.service.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const getSupabaseClient = () => SupabaseService.getClientOrThrow();

export class PlannerTools {
  @Tool({
    name: 'add_exam_schedule',
    description: 'Add an exam schedule to the planner.',
    inputSchema: z.object({
      userId: z.string().describe('The user ID'),
      subject: z.string().describe('The subject for the exam'),
      examDate: z.string().describe('The exam date (ISO format: YYYY-MM-DD)')
    }),
    examples: {
      request: {
        userId: 'user_001',
        subject: 'Machine Learning',
        examDate: '2024-06-15'
      },
      response: {
        scheduleId: 'exam_001',
        userId: 'user_001',
        subject: 'Machine Learning',
        examDate: '2024-06-15'
      }
    }
  })
  async addExamSchedule(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Adding exam schedule', { userId: input.userId, subject: input.subject, examDate: input.examDate });
    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('exam_schedules')
        .insert({
          user_id: input.userId,
          subject: input.subject,
          exam_date: input.examDate
        })
        .select();

      if (error) {
        ctx.logger.error('Error adding exam schedule', { error: error.message });
        throw error;
      }

      return {
        scheduleId: data?.[0]?.id,
        userId: input.userId,
        subject: input.subject,
        examDate: input.examDate
      };
    } catch (error) {
      ctx.logger.error('Error in addExamSchedule', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  @Tool({
    name: 'generate_roadmap',
    description: 'Generate a day-by-day study roadmap using Gemini AI.',
    inputSchema: z.object({
      userId: z.string().describe('The user ID'),
      subjects: z.array(z.string()).describe('Array of subject names'),
      examDates: z.array(z.string()).describe('Array of exam dates (ISO format)')
    }),
    examples: {
      request: {
        userId: 'user_001',
        subjects: ['Machine Learning', 'Data Science'],
        examDates: ['2024-06-15', '2024-06-20']
      },
      response: {
        roadmap: [
          {
            date: '2024-06-01',
            subject: 'Machine Learning',
            topics: ['Supervised Learning', 'Regression'],
            suggestedDuration: '2 hours'
          }
        ]
      }
    }
  })
  async generateRoadmap(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating roadmap', { userId: input.userId, subjects: input.subjects });
    const supabase = getSupabaseClient();

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const subjectsText = input.subjects.join(', ');
      const daysUntilExam = 30; // Simplified: assume 30 days

      const prompt = `Create a ${daysUntilExam}-day study roadmap for these subjects: ${subjectsText}.

For each day, provide:
- date (starting from today)
- subject
- topics (2-3 key topics to study)
- suggestedDuration (e.g., "2 hours")

Format as JSON array with objects containing: date, subject, topics (array), suggestedDuration.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      let roadmap;
      try {
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        roadmap = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      } catch {
        roadmap = [];
      }

      // Store roadmap items in Supabase
      for (const item of roadmap) {
        await supabase
          .from('roadmap_items')
          .insert({
            user_id: input.userId,
            date: item.date,
            subject: item.subject,
            topics: item.topics,
            is_ai_suggested: true
          });
      }

      return {
        userId: input.userId,
        roadmap,
        itemCount: roadmap.length
      };
    } catch (error) {
      ctx.logger.error('Error generating roadmap', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  @Tool({
    name: 'attach_resource_link',
    description: 'Generate a YouTube search URL for a topic.',
    inputSchema: z.object({
      topic: z.string().describe('The topic to search for')
    }),
    examples: {
      request: {
        topic: 'Machine Learning Basics'
      },
      response: {
        topic: 'Machine Learning Basics',
        youtubeUrl: 'https://youtube.com/results?search_query=Machine+Learning+Basics'
      }
    }
  })
  async attachResourceLink(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Attaching resource link', { topic: input.topic });

    const encodedTopic = encodeURIComponent(input.topic);
    const youtubeUrl = `https://youtube.com/results?search_query=${encodedTopic}`;

    return {
      topic: input.topic,
      youtubeUrl
    };
  }

  @Tool({
    name: 'get_todo_list',
    description: 'Get merged todo list of AI-suggested roadmap tasks and user-added tasks for a specific date.',
    inputSchema: z.object({
      userId: z.string().describe('The user ID'),
      date: z.string().describe('The date (ISO format: YYYY-MM-DD)')
    }),
    examples: {
      request: {
        userId: 'user_001',
        date: '2024-06-01'
      },
      response: {
        userId: 'user_001',
        date: '2024-06-01',
        tasks: []
      }
    }
  })
  async getTodoList(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Getting todo list', { userId: input.userId, date: input.date });

    try {
      const supabase = getSupabaseClient();
      // Get roadmap items for the date
      const { data: roadmapData } = await supabase
        .from('roadmap_items')
        .select('*')
        .eq('user_id', input.userId)
        .eq('date', input.date);

      // Get user tasks for the date
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', input.userId)
        .eq('date', input.date);

      const tasks = [
        ...(roadmapData || []).map((r: any) => ({
          id: r.id,
          description: `Study: ${r.topics?.join(', ')}`,
          isAiSuggested: true,
          completed: false
        })),
        ...(tasksData || []).map((t: any) => ({
          id: t.id,
          description: t.description,
          isAiSuggested: t.is_ai_suggested,
          completed: t.completed
        }))
      ];

      return {
        userId: input.userId,
        date: input.date,
        tasks
      };
    } catch (error) {
      ctx.logger.error('Error getting todo list', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  @Tool({
    name: 'add_custom_task',
    description: 'Add a custom task to the todo list.',
    inputSchema: z.object({
      userId: z.string().describe('The user ID'),
      date: z.string().describe('The date (ISO format: YYYY-MM-DD)'),
      description: z.string().describe('Task description')
    }),
    examples: {
      request: {
        userId: 'user_001',
        date: '2024-06-01',
        description: 'Review chapter 5'
      },
      response: {
        taskId: 'task_001',
        userId: 'user_001',
        date: '2024-06-01',
        description: 'Review chapter 5'
      }
    }
  })
  async addCustomTask(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Adding custom task', { userId: input.userId, date: input.date });
    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: input.userId,
          date: input.date,
          description: input.description,
          is_ai_suggested: false,
          completed: false
        })
        .select();

      if (error) {
        ctx.logger.error('Error adding custom task', { error: error.message });
        throw error;
      }

      return {
        taskId: data?.[0]?.id,
        userId: input.userId,
        date: input.date,
        description: input.description
      };
    } catch (error) {
      ctx.logger.error('Error in addCustomTask', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  @Tool({
    name: 'complete_task',
    description: 'Mark a task as complete. AI-suggested tasks earn 1.5x coin multiplier.',
    inputSchema: z.object({
      taskId: z.string().describe('The task ID'),
      wasAiSuggested: z.boolean().describe('Whether the task was AI-suggested')
    }),
    examples: {
      request: {
        taskId: 'task_001',
        wasAiSuggested: true
      },
      response: {
        taskId: 'task_001',
        completed: true,
        coinsAwarded: 15
      }
    }
  })
  async completeTask(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Completing task', { taskId: input.taskId, wasAiSuggested: input.wasAiSuggested });
    const supabase = getSupabaseClient();

    try {
      // Mark task as complete
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('id', input.taskId);

      if (updateError) {
        ctx.logger.error('Error completing task', { error: updateError.message });
        throw updateError;
      }

      // Calculate coins: 10 base coins, 1.5x multiplier for AI-suggested
      const baseCoins = 10;
      const coinsAwarded = input.wasAiSuggested ? Math.round(baseCoins * 1.5) : baseCoins;

      return {
        taskId: input.taskId,
        completed: true,
        coinsAwarded
      };
    } catch (error) {
      ctx.logger.error('Error in completeTask', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
}
