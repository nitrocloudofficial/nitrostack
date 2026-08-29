import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';

export class YatraResources {
  @Resource({
    uri: 'knowledge_base/hampi.json',
    name: 'Hampi Knowledge Base',
    description: 'A curated list of facts and myths about the Vijayanagara Empire in Hampi',
    mimeType: 'application/json'
  })
  async getHampiKnowledgeBase(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching Hampi Knowledge Base');
    
    try {
      const filePath = path.join(process.cwd(), 'knowledge_base', 'hampi.json');
      const data = fs.readFileSync(filePath, 'utf-8');
      
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: data
        }]
      };
    } catch (e) {
      ctx.logger.error('Failed to read hampi.json', { error: e instanceof Error ? e.message : String(e) });
      throw new Error('Could not read knowledge base');
    }
  }

  // Progress cache can be in-memory for the session duration
  private progressCache: Record<string, any> = {};

  @Resource({
    uri: 'progress/{session_id}',
    name: 'User Progress',
    description: 'Retrieves the learning progress for a specific session ID',
    mimeType: 'application/json'
  })
  async getProgress(uri: string, ctx: ExecutionContext) {
    const sessionId = uri.split('/').pop() || 'default';
    ctx.logger.info(`Fetching progress for session ${sessionId}`);

    const progress = this.progressCache[sessionId] || {
      completedChapters: [],
      currentChapter: 1,
      quizAttempts: {}
    };

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(progress, null, 2)
      }]
    };
  }

  private sceneCache: Record<string, any> = {
    '1': { image: 'hampi_ch1.jpg' },
    '2': { image: 'hampi_ch2.jpg' },
    '3': { image: 'hampi_ch3.jpg' }
  };

  @Resource({
    uri: 'scene_cache/{chapter_id}',
    name: 'Scene Cache',
    description: 'Retrieves the generated scene data for a specific chapter ID',
    mimeType: 'application/json'
  })
  async getScene(uri: string, ctx: ExecutionContext) {
    const chapterId = uri.split('/').pop() || '1';
    ctx.logger.info(`Fetching scene cache for chapter ${chapterId}`);

    const scene = this.sceneCache[chapterId] || null;

    if (!scene) {
      throw new Error('Scene not found for chapter ' + chapterId);
    }

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(scene, null, 2)
      }]
    };
  }
}
