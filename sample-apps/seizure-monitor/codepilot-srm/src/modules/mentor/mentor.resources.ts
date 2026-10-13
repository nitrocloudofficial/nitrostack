import { ResourceDecorator as Resource, ControllerDecorator as Controller, ExecutionContext } from '@nitrostack/core';
import { QUESTIONS } from './data/questions.js';

export const TOPICS = [
  { name: 'Arrays', description: 'Fundamental data structure for contiguous elements.', pattern: 'Two Pointers, Hash Map' },
  { name: 'Strings', description: 'Pattern matching and character manipulation.', pattern: 'Sliding Window' },
  { name: 'Searching', description: 'Finding elements efficiently.', pattern: 'Binary Search' },
  { name: 'Sorting', description: 'Ordering elements.', pattern: 'Merge Sort, Quick Sort' },
  { name: 'Binary Search', description: 'O(log n) search on sorted data.', pattern: 'Binary Search' },
  { name: 'Trees', description: 'Hierarchical data structures.', pattern: 'DFS, BFS' },
  { name: 'Graphs', description: 'Nodes and edges for relationships.', pattern: 'DFS, BFS, Union Find' },
  { name: 'Dynamic Programming', description: 'Overlapping subproblems and optimal substructure.', pattern: 'Memoization, Tabulation' },
  { name: 'Greedy', description: 'Local optimum choices.', pattern: 'Greedy' },
  { name: 'Heap', description: 'Priority queues.', pattern: 'Top K Elements' },
  { name: 'Backtracking', description: 'Exploring all potential solutions.', pattern: 'Backtracking' }
];

@Controller('mentor-resources')
export class MentorResources {
  @Resource({
    uri: 'codepilot://topics',
    name: 'CodePilot Topics',
    description: 'List of available DSA topics with difficulty levels and problem counts',
    mimeType: 'application/json',
    examples: {
      response: {
        topics: [
          { name: 'Arrays', problemCount: 5, description: 'Fundamental data structure', pattern: 'Two Pointers' }
        ]
      }
    }
  })
  async getTopics(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching mentor topics');

    const topicsWithCounts = TOPICS.map(topic => {
      const problemCount = QUESTIONS.filter(q => q.topic === topic.name).length;
      return {
        ...topic,
        problemCount
      };
    });

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({ topics: topicsWithCounts }, null, 2)
      }]
    };
  }

  @Resource({
    uri: 'codepilot://questions',
    name: 'CodePilot Questions Bank',
    description: 'List of all realistic DSA problems available in CodePilot SRM',
    mimeType: 'application/json'
  })
  async getQuestions(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching question bank');

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({ questions: QUESTIONS }, null, 2)
      }]
    };
  }
}
