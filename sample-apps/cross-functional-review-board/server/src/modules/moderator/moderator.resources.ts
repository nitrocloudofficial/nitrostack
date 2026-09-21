import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROTOCOL_PATH = path.resolve(__dirname, '../../../../workflow/debate_protocol.md');
const MODERATOR_PROMPT_PATH = path.resolve(__dirname, '../../../../prompts/moderator_agent.md');

export class ModeratorResources {
  @Resource({
    uri: 'moderator://protocol',
    name: 'Moderator Protocol & Decision Policy',
    description: 'Deterministic 4-rule decision policy for synthesis',
    mimeType: 'text/markdown'
  })
  async getProtocol(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching moderator protocol');
    let text = '# Moderator Policy\nDeterministic decision rules 1-4.';
    if (fs.existsSync(PROTOCOL_PATH)) text += '\n\n' + fs.readFileSync(PROTOCOL_PATH, 'utf-8');
    if (fs.existsSync(MODERATOR_PROMPT_PATH)) text += '\n\n' + fs.readFileSync(MODERATOR_PROMPT_PATH, 'utf-8');

    return {
      contents: [{
        uri,
        mimeType: 'text/markdown',
        text
      }]
    };
  }
}
