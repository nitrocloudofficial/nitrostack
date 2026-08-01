import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class QuizPrompts {
  @Prompt({
    name: 'generate_quiz',
    description: 'Generate a practice quiz for a specific subject and type. Perfect for exam preparation.',
    arguments: [
      {
        name: 'subject',
        description: 'Subject to quiz on: "DBMS", "OS", "Networks", "TOC", "SE".',
        required: true,
      },
      {
        name: 'type',
        description: 'Question type: "mcq", "viva", "flashcard", or "mixed".',
        required: false,
      },
      {
        name: 'count',
        description: 'Number of questions (default: 5).',
        required: false,
      },
    ],
  })
  async getQuizPrompt(args: { subject: string; type?: string; count?: string }, ctx: ExecutionContext) {
    const type = args.type || 'mcq';
    const count = args.count || '5';

    return [
      {
        role: 'user' as const,
        content: `Generate ${count} ${type} questions for ${args.subject}.`,
      },
      {
        role: 'assistant' as const,
        content: `I'll generate a ${type.toUpperCase()} quiz for ${args.subject} to help you prepare!

Calling **generate_quiz(subject="${args.subject}", type="${type}", count=${count})** now.

After the quiz is ready:
- For MCQs: Try to answer each question before looking at the answer
- For Viva questions: Practice speaking your answer out loud
- For Flashcards: Cover the answer and test your recall

Good luck! 🎓`,
      },
    ];
  }
}
