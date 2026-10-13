import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SupabaseService } from '../../services/supabase.service.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const getSupabaseClient = () => SupabaseService.getClientOrThrow();

export class ChatTools {
  @Tool({
    name: 'chat_with_context',
    description: 'Chat with Vidya (AI assistant) using stored research summaries as context. Stores conversation in Supabase.',
    inputSchema: z.object({
      sessionId: z.string().describe('The session ID for context'),
      userMessage: z.string().describe('The user\'s message'),
      researchSummaries: z.array(z.string()).optional().describe('Optional array of research summaries for context')
    }),
    examples: {
      request: {
        sessionId: 'session_001',
        userMessage: 'What are the key applications?',
        researchSummaries: ['Summary 1', 'Summary 2']
      },
      response: {
        sessionId: 'session_001',
        userMessage: 'What are the key applications?',
        assistantMessage: 'Based on the research...'
      }
    }
  })
  async chatWithContext(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Chat with context', { sessionId: input.sessionId });
    const supabase = getSupabaseClient();

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      // Build context from research summaries
      let contextText = '';
      if (input.researchSummaries && input.researchSummaries.length > 0) {
        contextText = `Based on the following research summaries:\n\n${input.researchSummaries.join('\n\n')}\n\n`;
      }

      const prompt = `${contextText}User: ${input.userMessage}

Provide a helpful, educational response as Vidya, an AI tutor.`;

      const result = await model.generateContent(prompt);
      const assistantMessage = result.response.text();

      // Store conversation in Supabase
      const { error: userError } = await supabase
        .from('chat_history')
        .insert({
          session_id: input.sessionId,
          role: 'user',
          message: input.userMessage,
          created_at: new Date().toISOString()
        });

      const { error: assistantError } = await supabase
        .from('chat_history')
        .insert({
          session_id: input.sessionId,
          role: 'assistant',
          message: assistantMessage,
          created_at: new Date().toISOString()
        });

      if (userError || assistantError) {
        ctx.logger.error('Error storing chat history', { userError: userError?.message, assistantError: assistantError?.message });
      }

      return {
        sessionId: input.sessionId,
        userMessage: input.userMessage,
        assistantMessage
      };
    } catch (error) {
      ctx.logger.error('Error in chat', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
}
