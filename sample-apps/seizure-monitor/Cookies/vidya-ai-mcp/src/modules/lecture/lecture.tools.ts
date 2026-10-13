import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SupabaseService } from '../../services/supabase.service.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const getSupabaseClient = () => SupabaseService.getClientOrThrow();

export class LectureTools {
  @Tool({
    name: 'generate_lecture_script',
    description: 'Generate a lecture script based on a topic and summary. Returns script text and sentence breakdown for TTS on the frontend.',
    inputSchema: z.object({
      topic: z.string().describe('The topic for the lecture'),
      summary: z.string().describe('A summary of the topic to base the lecture on')
    }),
    examples: {
      request: {
        topic: 'machine learning in healthcare',
        summary: 'Deep learning is revolutionizing medical imaging...'
      },
      response: {
        script: 'Today we will explore...',
        sentences: ['Sentence 1', 'Sentence 2']
      }
    }
  })
  @Widget('lecture-script')
  async generateLectureScript(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating lecture script', { topic: input.topic });
    const supabase = getSupabaseClient();

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const prompt = `Create a comprehensive lecture script about "${input.topic}" based on this summary:

${input.summary}

The script should be:
- 3-4 paragraphs long
- Educational and engaging
- Suitable for text-to-speech narration
- Include key concepts and examples

Format the response as a single continuous script (no bullet points or special formatting).`;

      const result = await model.generateContent(prompt);
      const script = result.response.text();

      // Split script into sentences for TTS
      const sentences = script
        .split(/(?<=[.!?])\s+/)
        .filter(s => s.trim().length > 0)
        .map(s => s.trim());

      // Store in Supabase
      const { error } = await supabase
        .from('lecture_scripts')
        .insert({
          topic: input.topic,
          script_text: script,
          sentences: sentences,
          created_at: new Date().toISOString()
        });

      if (error) {
        ctx.logger.error('Error storing lecture script', { error: error.message });
      }

      return {
        topic: input.topic,
        script,
        sentences,
        sentenceCount: sentences.length
      };
    } catch (error) {
      ctx.logger.error('Error generating lecture script', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
}
