import { Tool } from '../../tool.js';
import { BaseSearchTransform } from './base-search.transform.js';
import { SearchTransformOptions } from './types.js';

interface ToolSearchMetadata {
  name: string;
  title: string;
  description: string;
  paramKeywords: string;
}

export class RegexSearchTransform extends BaseSearchTransform {
  readonly name = 'RegexSearchTransform';
  private toolsList: Tool[] = [];
  private toolMetadata: Map<string, ToolSearchMetadata> = new Map();

  constructor(options: SearchTransformOptions = {}) {
    super(options);
  }

  protected updateIndex(tools: Tool[], _hash: string): void {
    this.toolsList = tools;
    this.toolMetadata.clear();

    for (const tool of tools) {
      let paramKeywords = '';
      const schema = tool.inputSchema as any;
      if (schema) {
        if (schema.properties && typeof schema.properties === 'object') {
          for (const [key, prop] of Object.entries(schema.properties)) {
            paramKeywords += ` ${key}`;
            if (prop && typeof prop === 'object' && (prop as any).description) {
              paramKeywords += ` ${(prop as any).description}`;
            }
          }
        } else {
          // Extract Zod schema shape properties if available
          const shape =
            typeof schema._def?.shape === 'function'
              ? schema._def.shape()
              : schema.shape || schema._def?.shape;
          if (shape && typeof shape === 'object') {
            for (const [key, prop] of Object.entries(shape)) {
              paramKeywords += ` ${key}`;
              if (prop && typeof prop === 'object' && (prop as any).description) {
                paramKeywords += ` ${(prop as any).description}`;
              }
            }
          }
        }
      }

      this.toolMetadata.set(tool.name, {
        name: tool.name,
        title: (tool as any).title || '',
        description: tool.description || '',
        paramKeywords,
      });
    }
  }

  protected async search(query: string, limit: number): Promise<Tool[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    let regex: RegExp;
    try {
      regex = new RegExp(query, 'i');
    } catch {
      // Graceful syntax error recovery: fall back to case-insensitive literal substring matching
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      regex = new RegExp(escaped, 'i');
    }

    const matches: Tool[] = [];
    for (const tool of this.toolsList) {
      const meta = this.toolMetadata.get(tool.name);
      if (!meta) continue;

      const matchesName = regex.test(meta.name);
      const matchesTitle = meta.title ? regex.test(meta.title) : false;
      const matchesDesc = regex.test(meta.description);
      const matchesParams = regex.test(meta.paramKeywords);

      if (matchesName || matchesTitle || matchesDesc || matchesParams) {
        matches.push(tool);
        if (matches.length >= limit) {
          break;
        }
      }
    }

    return matches;
  }
}
