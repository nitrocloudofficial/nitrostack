import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class NotesPrompts {
  @Prompt({
    name: 'explain_topic',
    description: 'Get a simple, student-friendly explanation of any computer science topic with a real-world analogy and practice questions.',
    arguments: [
      {
        name: 'topic',
        description: 'The concept to explain, e.g. "Normalization", "Paging", "Deadlock", "TCP", "DFA".',
        required: true,
      },
      {
        name: 'subject',
        description: 'Subject context, e.g. "DBMS", "OS", "Networks".',
        required: false,
      },
    ],
  })
  async getTopicExplanation(args: { topic: string; subject?: string }, ctx: ExecutionContext) {
    return [
      {
        role: 'user' as const,
        content: `Explain "${args.topic}"${args.subject ? ` in ${args.subject}` : ''} in simple terms.`,
      },
      {
        role: 'assistant' as const,
        content: `I'll explain "${args.topic}" using the syllabus data and a simple analogy.

I'm calling **explain_topic(topic="${args.topic}"${args.subject ? `, subject="${args.subject}"` : ''})** to get:
- A clear definition from your syllabus
- A real-world analogy to make it stick
- Related topics you should also know
- 5 practice questions for exam preparation

This explanation is tailored to your 5th semester CSE curriculum.`,
      },
    ];
  }

  @Prompt({
    name: 'summarize_notes',
    description: 'Generate a comprehensive notes summary for a subject or a specific unit, perfect for last-minute exam revision.',
    arguments: [
      {
        name: 'subject',
        description: 'Subject to summarize, e.g. "DBMS", "Operating Systems", "CS503".',
        required: true,
      },
      {
        name: 'unit',
        description: 'Optional unit number (1-5) to focus the summary.',
        required: false,
      },
    ],
  })
  async getSummaryPrompt(args: { subject: string; unit?: string }, ctx: ExecutionContext) {
    return [
      {
        role: 'user' as const,
        content: `Summarize ${args.unit ? `Unit ${args.unit} of ` : ''}${args.subject} for my exam revision.`,
      },
      {
        role: 'assistant' as const,
        content: `I'll create a structured revision summary for ${args.subject}${args.unit ? ` Unit ${args.unit}` : ''}.

Calling **summarize_notes(subject="${args.subject}"${args.unit ? `, unit=${args.unit}` : ''})** to retrieve:
- All key topics and subtopics
- Important definitions to memorize
- Flashcards for quick revision
- Study tips and exam importance

This summary will be based on your actual syllabus content.`,
      },
    ];
  }
}
