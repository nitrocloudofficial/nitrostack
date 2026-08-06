import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { Learn2EarnService } from './learn2earn.service.js';

function json(uri: string, value: unknown) {
  return {
    contents: [
      {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

export class Learn2EarnResources {
  constructor(private learn2earn: Learn2EarnService) {}

  @Resource({
    uri: 'learn2earn://roadmap',
    name: 'Learner Complete Roadmap',
    description: "Returns the learner's complete personalized roadmap including completed, current, and upcoming milestones.",
    mimeType: 'application/json',
  })
  async getRoadmap(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Reading roadmap resource');
    return json(uri, this.learn2earn.getRoadmap() || { message: 'No roadmap generated yet. Call generate_learning_roadmap first.' });
  }

  @Resource({
    uri: 'learn2earn://session/current/concept-map',
    name: 'Current Concept Map',
    description: "Returns the learner's active concept map node structure and mastery statuses.",
    mimeType: 'application/json',
  })
  async getConceptMap(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Reading concept map resource');
    const session = this.learn2earn.getSession();
    return json(uri, session ? { topic: session.topic, concepts: session.concepts } : { message: 'No active session. Call start_learning_session first.' });
  }

  @Resource({
    uri: 'learn2earn://session/current/wallet',
    name: 'Current Reward Wallet State',
    description: 'Returns the current deposited, locked, and unlocked reward cash amounts.',
    mimeType: 'application/json',
  })
  async getWallet(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Reading wallet resource');
    const session = this.learn2earn.getSession();
    return json(uri, session ? session.wallet : { message: 'No active session.' });
  }

  @Resource({
    uri: 'learn2earn://session/current/progress-log',
    name: 'Learner Progress History Log',
    description: 'Returns a timestamped log of quiz attempts, score achievements, and wallet unlock events.',
    mimeType: 'application/json',
  })
  async getProgressLog(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Reading progress log resource');
    const session = this.learn2earn.getSession();
    return json(uri, session ? session.progress_log : []);
  }

  @Resource({
    uri: 'learn2earn://session/current/full',
    name: 'Full Current Session',
    description: 'Returns the entire active session object: topic, concepts, wallet, and progress log.',
    mimeType: 'application/json',
  })
  async getFullSession(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Reading full session resource');
    return json(uri, this.learn2earn.getSession() || { message: 'No active session. Call start_learning_session first.' });
  }
}
