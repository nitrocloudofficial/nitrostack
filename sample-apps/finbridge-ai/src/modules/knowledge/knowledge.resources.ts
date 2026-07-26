import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

/**
 * Resolve the project's data/ directory relative to THIS module, not to
 * process.cwd().
 *
 * Compiled layout is dist/modules/knowledge/knowledge.resources.js, so the
 * project root is three levels up. cwd is not reliable once the server is
 * started by a process manager, a container entrypoint, or an MCP client that
 * spawns it from another directory — which covers every deployment target we
 * have.
 */
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(MODULE_DIR, '..', '..', '..', 'data');

function readDataFile(fileName: string, ctx: ExecutionContext): string {
  const file = path.join(DATA_DIR, fileName);
  try {
    return fs.readFileSync(file, 'utf-8');
  } catch (error: any) {
    ctx.logger.error('Failed to read data file', { file, error: error.message });
    throw new Error(
      `Could not read ${fileName} at ${file}. ` +
        'Confirm data/ ships alongside dist/ in the deployed artifact.'
    );
  }
}

export class KnowledgeResources {
  @Resource({
    uri: 'finbridge://schemes',
    name: 'FinBridge Schemes',
    description:
      'The codified rulebook: all seven public schemes with age bands, income ceilings, gender restrictions, account and tax-payer requirements, benefits, documents, and apply links.',
    mimeType: 'application/json'
  })
  async getSchemes(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Resource requested', { uri: 'finbridge://schemes' });
    // NitroStack builds the { contents: [...] } envelope itself. Returning one
    // here nests it, and the client receives an envelope inside .text.
    return readDataFile('schemes.json', ctx);
  }

  @Resource({
    uri: 'finbridge://glossary',
    name: 'FinBridge Glossary',
    description:
      'Plain-language definitions of the financial terms used across FinBridge tools.',
    mimeType: 'application/json'
  })
  async getGlossary(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Resource requested', { uri: 'finbridge://glossary' });
    return readDataFile('glossary.json', ctx);
  }
}
