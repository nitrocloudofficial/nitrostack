/**
 * Classifier Service — AI Classification Layer
 * 
 * Classifies incoming work items into types (EMAIL, MEETING, CALENDAR, TASK)
 * using keyword heuristics and semantic scoring.
 * 
 * No external AI APIs — pure heuristic-based classification.
 */

import { Injectable } from '@nitrostack/core';
import { WorkItemType } from '../../shared/index.js';

/**
 * Classification Result
 * 
 * Returned by the classifier with confidence and matched keywords.
 */
export interface ClassificationResult {
  type: WorkItemType;
  confidence: number; // 0–1
  keywordsMatched: string[];
}

/**
 * Keyword sets for each work item type
 */
const CLASSIFICATION_KEYWORDS = {
  [WorkItemType.EMAIL]: {
    keywords: ['reply', 'send', 'forward', 'email', 'message', 'respond', 'draft', 'compose'],
    weight: 1.0,
  },
  [WorkItemType.MEETING]: {
    keywords: ['meet', 'meeting', 'call', 'sync', 'standup', 'conference', 'huddle', 'discuss'],
    weight: 1.0,
  },
  [WorkItemType.CALENDAR]: {
    keywords: ['calendar', 'schedule', 'block', 'time', 'slot', 'availability', 'book', 'reserve'],
    weight: 1.0,
  },
  [WorkItemType.TASK]: {
    keywords: ['task', 'todo', 'do', 'complete', 'finish', 'build', 'create', 'implement', 'fix', 'update'],
    weight: 0.8, // Lower weight for default type
  },
};

/**
 * Classifier Service
 * 
 * Provides classification logic for work items.
 */
@Injectable()
export class ClassifierService {
  /**
   * Classify a work item based on title and description.
   * 
   * @param title - Work item title
   * @param description - Work item description
   * @returns ClassificationResult with type, confidence, and matched keywords
   */
  classifyWorkItem(title: string, description: string): ClassificationResult {
    const normalizedTitle = title.toLowerCase();
    const normalizedDescription = description.toLowerCase();

    // Score each type
    const scores: Record<WorkItemType, { score: number; keywords: string[] }> = {
      [WorkItemType.EMAIL]: { score: 0, keywords: [] },
      [WorkItemType.MEETING]: { score: 0, keywords: [] },
      [WorkItemType.CALENDAR]: { score: 0, keywords: [] },
      [WorkItemType.TASK]: { score: 0, keywords: [] },
    };

    // Calculate scores for each type
    for (const [type, config] of Object.entries(CLASSIFICATION_KEYWORDS)) {
      const typedType = type as WorkItemType;
      let typeScore = 0;
      const matchedKeywords: string[] = [];

      for (const keyword of config.keywords) {
        // Title matches count more (2x weight)
        if (normalizedTitle.includes(keyword)) {
          typeScore += 2 * config.weight;
          matchedKeywords.push(keyword);
        }
        // Description matches count less (1x weight)
        else if (normalizedDescription.includes(keyword)) {
          typeScore += 1 * config.weight;
          matchedKeywords.push(keyword);
        }
      }

      scores[typedType] = { score: typeScore, keywords: matchedKeywords };
    }

    // Find the type with the highest score
    let bestType = WorkItemType.TASK; // Default
    let bestScore = 0;
    let bestKeywords: string[] = [];

    for (const [type, { score, keywords }] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestType = type as WorkItemType;
        bestKeywords = keywords;
      }
    }

    // Normalize confidence to 0–1 range
    // Max possible score: 2 keywords * 2 weight (title) + 2 keywords * 1 weight (description) = 6
    const maxPossibleScore = 6;
    let confidence = Math.min(bestScore / maxPossibleScore, 1.0);

    // If confidence is very low, default to TASK but keep low confidence
    if (confidence < 0.3) {
      bestType = WorkItemType.TASK;
      confidence = 0.3; // Minimum confidence for default
    }

    return {
      type: bestType,
      confidence,
      keywordsMatched: bestKeywords,
    };
  }
}
