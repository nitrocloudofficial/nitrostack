import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';
import { Learn2EarnService } from './learn2earn.service.js';

export class Learn2EarnPrompts {
  constructor(private learn2earn: Learn2EarnService) {}

  @Prompt({
    name: 'explain_concept_simply',
    description: 'Generates a beginner-friendly explanation template with relatable analogies for any concept.',
    arguments: [{ name: 'concept_name', description: 'Name of the concept to explain', required: true }],
  })
  async explainConceptSimply(args: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating explain_concept_simply prompt', { concept_name: args.concept_name });
    const conceptName = args.concept_name || 'the concept';
    return [
      {
        role: 'user' as const,
        content: `Explain "${conceptName}" to a beginner using a real-world everyday analogy. Break down the key terms and why it matters in practical applications. Keep it intuitive and concise.`,
      },
    ];
  }

  @Prompt({
    name: 'teach_this_differently',
    description:
      'Generates a prompt template asking the model to re-explain the SAME concept using a different teaching approach (e.g., more visual, example-driven, or formula-driven).',
    arguments: [
      { name: 'concept_id', description: 'ID or name of the concept to re-explain', required: true },
      { name: 'previous_explanation', description: 'The previous explanation that was not understood', required: false },
    ],
  })
  async teachThisDifferently(args: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating teach_this_differently prompt', { concept_id: args.concept_id });
    const conceptId = args.concept_id || 'concept';
    const session = this.learn2earn.getSession();
    const concept = session?.concepts.find((c) => c.id === conceptId || c.name.toLowerCase() === String(conceptId).toLowerCase());
    const conceptName = concept?.name || conceptId;
    const prev = args.previous_explanation || concept?.lessons?.quick?.explanation || 'standard explanation';

    return [
      {
        role: 'user' as const,
        content: `I read this explanation for "${conceptName}" but I still don't quite get it:
"""${prev}"""

Please re-explain "${conceptName}" using a DIFFERENT teaching approach than before (e.g. more visual/spatial, more real-world example-driven, or step-by-step formula breakdown). Use a fresh analogy and avoid repetitive terminology.`,
      },
    ];
  }

  @Prompt({
    name: 'generate_revision_plan',
    description: "Generates a spaced-revision schedule based on the learner's mastered vs pending concepts.",
    arguments: [{ name: 'session_id', description: 'ID of the learning session (optional, defaults to current)', required: false }],
  })
  async generateRevisionPlan(_args: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating revision plan prompt');
    const session = this.learn2earn.getSession();
    const topic = session?.topic || 'Study Topic';
    const mastered = session?.concepts.filter((c) => c.status === 'mastered').map((c) => c.name) || [];
    const pending = session?.concepts.filter((c) => c.status !== 'mastered').map((c) => c.name) || [];

    return [
      {
        role: 'user' as const,
        content: `Create a 3-day spaced review plan for the topic "${topic}".
Mastered concepts: ${mastered.join(', ') || 'None yet'}.
Pending concepts to learn: ${pending.join(', ') || 'All concepts'}.
Provide 3 daily actionable revision goals with key questions to test understanding.`,
      },
    ];
  }

  @Prompt({
    name: 'motivate_learner',
    description: 'Generates an encouraging, mentor-style progress report and motivational prompt.',
    arguments: [{ name: 'session_id', description: 'ID of the learning session (optional, defaults to current)', required: false }],
  })
  async motivateLearner(_args: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating motivate_learner prompt');
    const session = this.learn2earn.getSession();
    const topic = session?.topic || 'Study Topic';
    const masteredCount = session?.concepts.filter((c) => c.status === 'mastered').length || 0;
    const totalCount = session?.concepts.length || 0;
    const unlockedCash = session?.wallet.unlocked || 0;

    return [
      {
        role: 'user' as const,
        content: `Act as an enthusiastic AI learning mentor. The learner is studying "${topic}". They have mastered ${masteredCount} of ${totalCount} concepts and unlocked ₹${unlockedCash} in reward cash so far! Write a short, inspiring 3-sentence message celebrating their progress and urging them to tackle the next concept.`,
      },
    ];
  }
}
