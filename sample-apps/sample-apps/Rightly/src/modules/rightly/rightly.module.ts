import { Module } from '@nitrostack/core';
import { RightlyTools } from './rightly.tools.js';
import { RightlyResources } from './rightly.resources.js';
import { RightlyPrompts } from './rightly.prompts.js';
import { GeminiService } from '../../services/gemini.service.js';
import { EmailService } from '../../services/email.service.js';
import { SearchService } from '../../services/search.service.js';

/**
 * RightlyModule
 * 
 * Main module for the Rightly MCP server.
 * Implements two AI agents:
 * - Resolution Agent: Handles product issues, damage analysis, and legal notices
 * - Purchase Agent: Analyzes products and recommends alternatives
 */
@Module({
  name: 'rightly',
  description: 'Rightly - Consumer Protection & Smart Shopping MCP Server',
  controllers: [RightlyTools, RightlyResources, RightlyPrompts],
  providers: [GeminiService, EmailService, SearchService]
})
export class RightlyModule {}
