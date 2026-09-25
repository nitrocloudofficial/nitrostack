import { Tool } from '../../tool.js';
import { BaseSearchTransform } from './base-search.transform.js';
import { BM25Engine, BM25EngineOptions } from './bm25.engine.js';
import { SearchTransformOptions } from './types.js';

export interface BM25SearchTransformOptions extends SearchTransformOptions, BM25EngineOptions {}

export class BM25SearchTransform extends BaseSearchTransform {
  readonly name = 'BM25SearchTransform';
  private readonly engine: BM25Engine<Tool>;

  constructor(options: BM25SearchTransformOptions = {}) {
    super(options);
    this.engine = new BM25Engine<Tool>({
      k1: options.k1,
      b: options.b,
      nameBoost: options.nameBoost,
      titleBoost: options.titleBoost,
      paramBoost: options.paramBoost,
      descBoost: options.descBoost,
    });
  }

  protected updateIndex(tools: Tool[], hash: string): void {
    this.engine.indexTools(tools, hash);
  }

  protected async search(query: string, limit: number): Promise<Tool[]> {
    const results = this.engine.search(query, limit);
    return results.map((r) => r.item);
  }

  /**
   * Diagnostic statistics for debugging, telemetry, and test verification.
   */
  getEngineStats() {
    return this.engine.getStats();
  }

  /**
   * Diagnostic access to underlying BM25 engine.
   */
  getEngine(): BM25Engine<Tool> {
    return this.engine;
  }
}
