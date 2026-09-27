import { Module } from '@nitrostack/core';
import { ScoutTools } from './scout.tools.js';
import { FindingsBoardResources } from './findings-board.resource.js';

/**
 * ScoutModule — Person 1's deliverable
 *
 * Exposes:
 *   Tools:
 *     - scan_trending_topics     (Scout Agent's primary action)
 *     - detect_narrative_shift   (hype vs. substance vocabulary analysis)
 *
 *   Resources:
 *     - findings_board://latest/{ticker}   (Analyst reads this first)
 *     - findings_board://history/{ticker}  (Skeptic reads for recycled-content check)
 *     - findings_board://all               (Widget dashboard reads this)
 *
 * This module is the FIRST dependency for all other agents.
 * It must be confirmed working in NitroStudio via STDIO before Persons 2, 3, 4 build.
 */
@Module({
  name: 'scout',
  description:
    'Scout Agent: trending news ingestion, sentiment extraction, narrative shift detection. ' +
    'Owns and writes to the findings_board shared Resource (blackboard architecture).',
  controllers: [ScoutTools, FindingsBoardResources],
})
export class ScoutModule {}
