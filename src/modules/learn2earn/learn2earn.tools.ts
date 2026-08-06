import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { Learn2EarnService } from './learn2earn.service.js';

export class Learn2EarnTools {
  constructor(private learn2earn: Learn2EarnService) {}

  @Tool({
    name: 'analyze_topic',
    description:
      'Analyze a study topic or concept to determine its subject domain, key terminologies, math/code syntax needs, worked examples, and common misconceptions prior to generating lessons or quizzes.',
    inputSchema: z.object({
      topic: z.string().describe('Name of the topic or subject area to analyze'),
      concept_name: z.string().optional().describe('Optional specific concept within the topic'),
    }),
    examples: {
      request: { topic: 'Quantum Mechanics' },
      response: { topic: 'Quantum Mechanics', domain: 'physics', subject_area: 'Physics / Quantum Mechanics' },
    },
  })
  async analyzeTopic(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Analyzing topic', { topic: input.topic });
    const analysis = await this.learn2earn.analyzeTopicDomain(input.topic, input.concept_name);
    return { topic: input.topic, concept_name: input.concept_name || undefined, analysis };
  }

  @Tool({
    name: 'start_learning_session',
    description: 'Initialize a new Learn2Earn AI learning session with a topic or text content and a simulated deposit stake. Builds a concept map of 10-15 concepts.',
    inputSchema: z.object({
      mode: z.enum(['topic', 'text', 'pdf', 'jee']).default('topic').describe("Input mode ('topic', 'text', or 'jee')"),
      content: z.string().describe('Topic name or raw text content to extract concepts from'),
      deposit_amount: z.number().default(1000).describe('Simulated reward cash deposit (default 1000)'),
    }),
    examples: {
      request: { mode: 'topic', content: 'Neural Networks', deposit_amount: 1000 },
      response: { session_id: 's_1700000000000', topic: 'Neural Networks', concepts_count: 12 },
    },
  })
  async startLearningSession(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Starting learning session', { mode: input.mode, content: input.content });
    const session = await this.learn2earn.startSession(input.mode || 'topic', input.content, input.deposit_amount ?? 1000);
    return { session_id: session.session_id, topic: session.topic, concepts_count: session.concepts.length, session };
  }

  @Tool({
    name: 'start_jee_session',
    description: 'Initialize a syllabus-accurate JEE Mains learning track pre-loaded with chapters across Physics, Chemistry, and Maths.',
    inputSchema: z.object({
      subjects: z.array(z.enum(['physics', 'chemistry', 'maths'])).optional().describe("Subjects to include ('physics', 'chemistry', 'maths')"),
      deposit_amount: z.number().default(1000).describe('Simulated wallet stake deposit (default 1000)'),
    }),
    examples: {
      request: { subjects: ['physics', 'chemistry', 'maths'], deposit_amount: 1000 },
      response: { session_id: 's_jee_1700000000000', concepts_count: 63 },
    },
  })
  async startJeeSession(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Starting JEE session', { subjects: input.subjects });
    const session = await this.learn2earn.startJeeSession(input.subjects, input.deposit_amount ?? 1000);
    return { session_id: session.session_id, topic: session.topic, concepts_count: session.concepts.length, wallet: session.wallet, session };
  }

  @Tool({
    name: 'generate_quiz',
    description: 'Generate a randomized evaluation quiz for a target concept in the active learning session (multiple choice, or theory+numerical for JEE chapters).',
    inputSchema: z.object({
      concept_id: z.string().describe('ID of the concept to generate quiz for'),
      question_count: z.number().default(5).describe('Number of questions to generate (non-JEE mode only)'),
      force_fresh: z.boolean().default(false).describe('Force regeneration even if a cached quiz exists'),
    }),
    examples: {
      request: { concept_id: 'c1', question_count: 5 },
      response: { quiz: [{ id: 'q1', question: '...', options: ['...'], correct_index: 0 }] },
    },
  })
  async generateQuiz(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating quiz', { concept_id: input.concept_id });
    const result = await this.learn2earn.generateQuiz(input.concept_id, input.question_count ?? 5, input.force_fresh || false);
    return result;
  }

  @Tool({
    name: 'submit_quiz_answers',
    description: 'Submit quiz answers for a concept, evaluate score locally, and unlock wallet reward if score >= 80%.',
    inputSchema: z.object({
      concept_id: z.string().describe('ID of the concept'),
      answers: z.array(z.union([z.number(), z.string()])).describe('Array of selected option indices (MCQ) or numeric answers (numerical questions)'),
    }),
    examples: {
      request: { concept_id: 'c1', answers: [0, 1, 2] },
      response: { passed: true, score: 100, correct_count: 3, total_questions: 3 },
    },
  })
  async submitQuizAnswers(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Submitting quiz answers', { concept_id: input.concept_id });
    return this.learn2earn.submitAnswers(input.concept_id, input.answers || []);
  }

  @Tool({
    name: 'generate_lesson_content',
    description: 'Generate clear, structured teaching content (summary, explanation, key points, example, analogy, common mistakes, formula) for a concept before testing via quiz.',
    inputSchema: z.object({
      concept_id: z.string().describe('ID or name of concept to teach'),
      depth: z.enum(['quick', 'deep']).default('quick').describe("Teaching depth: 'quick' (under 90s read) or 'deep' (advanced edge-cases & connections)"),
    }),
    examples: {
      request: { concept_id: 'c1', depth: 'quick' },
      response: { concept_name: 'Foundations', lesson: { summary: '...', explanation: '...' } },
    },
  })
  async generateLessonContent(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating lesson content', { concept_id: input.concept_id, depth: input.depth });
    return this.learn2earn.generateLessonContent(input.concept_id, input.depth === 'deep' ? 'deep' : 'quick');
  }

  @Tool({
    name: 'fetch_external_context',
    description: 'Fetch a real-world reference summary and documentation link for a learning concept via the Wikipedia API.',
    inputSchema: z.object({
      concept_name: z.string().describe('Name of the concept to fetch external documentation for'),
    }),
    examples: {
      request: { concept_name: 'Neural Network' },
      response: { source: 'Wikipedia REST API', title: 'Neural network', summary: '...' },
    },
  })
  async fetchExternalContext(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Fetching external context', { concept_name: input.concept_name });
    return this.learn2earn.fetchWikipediaContext(input.concept_name);
  }

  @Tool({
    name: 'generate_learning_roadmap',
    description: "Generate a personalized career & learning milestone roadmap (4-6 progressive milestones) based on the learner's goal.",
    inputSchema: z.object({
      goal: z.string().describe("Target career or learning goal (e.g., 'AI Engineer', 'JEE Physics Master', 'Full-Stack Developer')"),
    }),
    examples: {
      request: { goal: 'AI Engineer' },
      response: { goal: 'AI Engineer', roadmap: [{ id: 'm1', title: 'Python Foundations & Mathematical Logic' }] },
    },
  })
  async generateLearningRoadmap(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating roadmap', { goal: input.goal });
    return this.learn2earn.generateRoadmapForGoal(input.goal);
  }

  @Tool({
    name: 'expand_learning_map',
    description: 'Expand the active learning session into a bigger, more detailed concept map (12-16 concepts) with granular sub-topics inserted.',
    inputSchema: z.object({}),
    examples: {
      request: {},
      response: { status: 'success', message: 'Expanded learning map to 14 concepts.' },
    },
  })
  async expandLearningMap(_input: any, ctx: ExecutionContext) {
    ctx.logger.info('Expanding learning map');
    const updatedSession = await this.learn2earn.expandMap();
    return {
      status: 'success',
      message: `Expanded learning map to ${updatedSession.concepts.length} concepts including granular sub-topics.`,
      session: updatedSession,
    };
  }
}
