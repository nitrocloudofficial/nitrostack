import { Tool } from '../../tool.js';
import { BaseSearchTransform } from './base-search.transform.js';
import { SearchTransformOptions } from './types.js';

/** Upper bound on an opted-in regex query, to cap worst-case backtracking. */
const MAX_REGEX_PATTERN_LENGTH = 200;

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

    const matchesField = this.buildMatcher(query);

    const matches: Tool[] = [];
    for (const tool of this.toolsList) {
      const meta = this.toolMetadata.get(tool.name);
      if (!meta) continue;

      const hit =
        matchesField(meta.name) ||
        (meta.title ? matchesField(meta.title) : false) ||
        matchesField(meta.description) ||
        matchesField(meta.paramKeywords);

      if (hit) {
        matches.push(tool);
        if (matches.length >= limit) {
          break;
        }
      }
    }

    return matches;
  }

  /**
   * Builds the per-query field matcher.
   *
   * The query reaches us straight from the MCP client, so compiling it as a regular
   * expression hands the caller an event-loop stall via catastrophic backtracking
   * (`(a+)+$` against a few dozen characters runs effectively forever). Literal
   * substring matching is the default; regex requires opting in through
   * `allowRegex` and is additionally capped by length.
   */
  private buildMatcher(query: string): (field: string) => boolean {
    if (this.options.allowRegex && query.length <= MAX_REGEX_PATTERN_LENGTH) {
      try {
        const regex = new RegExp(query, 'i');
        return (field: string) => regex.test(field);
      } catch {
        // Invalid syntax: fall through to literal matching.
      }
    }

    const needle = query.toLowerCase();
    return (field: string) => field.toLowerCase().includes(needle);
  }
}
