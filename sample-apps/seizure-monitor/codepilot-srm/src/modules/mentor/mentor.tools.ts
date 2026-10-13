import { ToolDecorator as Tool, ControllerDecorator as Controller, Widget, ExecutionContext, z } from '@nitrostack/core';
import { QUESTIONS } from './data/questions.js';

@Controller('mentor-tools')
export class MentorTools {
  @Tool({
    name: 'recommend_questions',
    description: 'Recommend a DSA question based on topic and difficulty. Use this to serve one rich problem card at a time.',
    inputSchema: z.object({
      topic: z.string().optional().describe('Filter by DSA topic (e.g., Arrays, Strings, Trees)'),
      difficulty: z.enum(['easy', 'medium', 'hard']).optional().describe('Filter by difficulty level')
    })
  })
  @Widget({
    route: 'question-card',
    domain: 'https://codepilot-srm-6a6c6c10-binary-brains-srmist.app.nitrocloud.ai',
    csp: {
      connectDomains: ['https://codepilot-srm-6a6c6c10-binary-brains-srmist.app.nitrocloud.ai'],
      resourceDomains: ['https://codepilot-srm-6a6c6c10-binary-brains-srmist.app.nitrocloud.ai']
    }
  })
  async recommendQuestions(input: { topic?: string; difficulty?: 'easy' | 'medium' | 'hard' }, ctx: ExecutionContext) {
    ctx.logger.info('Recommending single question', input);

    let filtered = QUESTIONS;
    if (input.topic) {
      filtered = filtered.filter(q => q.topic.toLowerCase() === input.topic?.toLowerCase());
    }
    if (input.difficulty) {
      filtered = filtered.filter(q => q.difficulty === input.difficulty);
    }
    
    // Pick a random question from the filtered set
    const selected = filtered.length > 0 ? filtered[Math.floor(Math.random() * filtered.length)] : QUESTIONS[0];

    return {
      filters_applied: {
        topic: input.topic || 'any',
        difficulty: input.difficulty || 'any'
      },
      question: selected,
      recommendation_reason: `Recommended because it is a fundamental ${selected.difficulty} problem in ${selected.topic}, frequently asked at ${selected.companies[0] || 'top companies'}.`
    };
  }

  @Tool({
    name: 'teach_concept',
    description: 'Teach a DSA concept or problem pattern (e.g. Binary Search, Sliding Window).',
    inputSchema: z.object({
      concept: z.string().describe('The concept or problem to explain')
    })
  })
  @Widget({
    route: 'concept-card',
    domain: 'https://codepilot-srm-6a6c6c10-binary-brains-srmist.app.nitrocloud.ai',
    csp: {
      connectDomains: ['https://codepilot-srm-6a6c6c10-binary-brains-srmist.app.nitrocloud.ai'],
      resourceDomains: ['https://codepilot-srm-6a6c6c10-binary-brains-srmist.app.nitrocloud.ai']
    }
  })
  async teachConcept(input: { concept: string }, ctx: ExecutionContext) {
    ctx.logger.info('Teaching concept', { concept: input.concept });

    const conceptLower = input.concept.toLowerCase();
    
    // Check if it's a specific problem title, then find its pattern
    let relatedProblem = QUESTIONS.find(q => q.title.toLowerCase() === conceptLower);
    
    const title = relatedProblem ? relatedProblem.pattern : input.concept;
    const topic = relatedProblem ? relatedProblem.topic : 'Algorithms';
    
    return {
      title,
      topic,
      intuition: `To master "${title}", you need to break it down. Think about what data structure is best suited for ${topic}. What information do you need to store as you iterate?`,
      whenToUse: `Use this pattern when you see keywords like "longest", "shortest", "optimal", or when dealing with sorted arrays.`,
      complexity: {
        time: 'Often reduces O(N^2) naive approaches to O(N) or O(N log N).',
        space: 'Usually requires O(1) or O(N) auxiliary space depending on the data structure used.'
      },
      commonMistakes: [
        'Not handling edge cases like empty inputs or single elements',
        'Off-by-one errors in loop boundaries',
        'Failing to consider time/space constraints during an interview'
      ],
      interviewTips: 'Start with a brute-force approach verbally, then immediately suggest this pattern to optimize it.',
      relatedProblemTitle: relatedProblem ? relatedProblem.title : null
    };
  }

  @Tool({
    name: 'generate_hints',
    description: 'Provide progressive hints for a problem.',
    inputSchema: z.object({
      problemId: z.string().describe('The ID of the problem'),
      currentHintLevel: z.number().min(0).max(3).describe('Current hint level shown to the user (0-3)')
    })
  })
  @Widget({
    route: 'hint-card',
    domain: 'https://codepilot-srm-6a6c6c10-binary-brains-srmist.app.nitrocloud.ai',
    csp: {
      connectDomains: ['https://codepilot-srm-6a6c6c10-binary-brains-srmist.app.nitrocloud.ai'],
      resourceDomains: ['https://codepilot-srm-6a6c6c10-binary-brains-srmist.app.nitrocloud.ai']
    }
  })
  async generateHints(input: { problemId: string, currentHintLevel: number }, ctx: ExecutionContext) {
    ctx.logger.info('Generating hints', input);
    
    const question = QUESTIONS.find(q => q.id === input.problemId);
    
    if (!question) {
      throw new Error(`Question with ID ${input.problemId} not found.`);
    }

    const maxHints = question.hints.length;
    const nextLevel = Math.min(input.currentHintLevel + 1, maxHints);
    const hintText = nextLevel > 0 ? question.hints[nextLevel - 1] : "No hints available.";

    return {
      problemId: question.id,
      problemTitle: question.title,
      hintLevel: nextLevel,
      totalHints: maxHints,
      hint: hintText,
      isFinalHint: nextLevel >= maxHints
    };
  }

  @Tool({
    name: 'generate_roadmap',
    description: 'Generate personalized study roadmaps for any duration (e.g. 5 days, 1 month).',
    inputSchema: z.object({
      totalDays: z.number().min(1).max(365).describe('Total duration of the roadmap in days'),
      targetCompany: z.string().optional().describe('Target company (e.g., Google, Meta)'),
      availableHoursPerDay: z.number().min(1).max(12).describe('Hours the student can dedicate per day')
    })
  })
  @Widget({
    route: 'roadmap-card',
    domain: 'https://codepilot-srm-6a6c6c10-binary-brains-srmist.app.nitrocloud.ai',
    csp: {
      connectDomains: ['https://codepilot-srm-6a6c6c10-binary-brains-srmist.app.nitrocloud.ai'],
      resourceDomains: ['https://codepilot-srm-6a6c6c10-binary-brains-srmist.app.nitrocloud.ai']
    }
  })
  async generateRoadmap(input: { totalDays: number, targetCompany?: string, availableHoursPerDay: number }, ctx: ExecutionContext) {
    ctx.logger.info('Generating roadmap', input);

    const isDaily = input.totalDays <= 14;
    const blocks = [];
    const topicsList = ['Arrays', 'Strings', 'Two Pointers', 'Sliding Window', 'Binary Search', 'Trees', 'Graphs', 'Dynamic Programming'];
    
    const numBlocks = isDaily ? input.totalDays : Math.ceil(input.totalDays / 7);
    const blockLabel = isDaily ? 'Day' : 'Week';
    
    for (let i = 1; i <= numBlocks; i++) {
      const topicIndex = Math.min(i - 1, topicsList.length - 1);
      const focusTopic = topicsList[topicIndex % topicsList.length];
      
      blocks.push({
        id: i,
        label: `${blockLabel} ${i}`,
        topics: [focusTopic],
        focus: `Mastering ${focusTopic}`,
        problemsTarget: isDaily ? input.availableHoursPerDay * 2 : input.availableHoursPerDay * 10,
        reason: `Focusing on ${focusTopic} is critical for ${input.targetCompany || 'top tier'} interviews.`
      });
    }

    return {
      roadmapInfo: {
        totalDays: input.totalDays,
        viewMode: isDaily ? 'daily' : 'weekly',
        targetCompany: input.targetCompany || 'General FAANG',
        dailyHours: input.availableHoursPerDay
      },
      plan: blocks
    };
  }

  @Tool({
    name: 'start_mock_interview',
    description: 'Simulate a FAANG interview. Selects a question and provides structured feedback criteria.',
    inputSchema: z.object({
      topic: z.string().optional().describe('Topic for the interview'),
      difficulty: z.enum(['easy', 'medium', 'hard']).optional().describe('Difficulty level'),
      company: z.string().optional().describe('Target company (e.g., Google, Amazon)')
    })
  })
  async startMockInterview(input: { topic?: string, difficulty?: 'easy' | 'medium' | 'hard', company?: string }, ctx: ExecutionContext) {
    ctx.logger.info('Starting mock interview', input);

    let candidates = QUESTIONS;
    if (input.topic) candidates = candidates.filter(q => q.topic.toLowerCase() === input.topic?.toLowerCase());
    if (input.difficulty) candidates = candidates.filter(q => q.difficulty === input.difficulty);
    if (input.company) candidates = candidates.filter(q => q.companies.some(c => c.toLowerCase() === input.company?.toLowerCase()));
    
    if (candidates.length === 0) candidates = QUESTIONS;
    
    const selectedQuestion = candidates[Math.floor(Math.random() * candidates.length)];
    const company = input.company || selectedQuestion.companies[0] || 'FAANG';

    return {
      scenario: `Welcome to your mock interview at ${company}. I'll be your interviewer today. We have 45 minutes.`,
      questionTitle: selectedQuestion.title,
      questionStatement: selectedQuestion.statement,
      interviewerExpectations: [
        'Ask clarifying questions before writing code.',
        'Propose a brute force solution first, then optimize.',
        'Discuss time and space complexity explicitly.',
        'Write clean, modular code.',
        'Test your code with edge cases.'
      ],
      rubric: [
        'Problem Solving: Did the candidate find the optimal solution?',
        'Coding: Is the code clean and bug-free?',
        'Communication: Did the candidate explain their thought process clearly?'
      ],
      suggestedFirstStep: "Start by restating the problem and asking any clarifying questions about the inputs."
    };
  }
}
