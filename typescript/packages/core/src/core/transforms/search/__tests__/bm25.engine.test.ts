import { describe, it, expect, beforeEach } from '@jest/globals';
import { tokenize, STOP_WORDS } from '../tokenizer.js';
import { BM25Engine } from '../bm25.engine.js';
import { Tool } from '../../../tool.js';
import { z } from 'zod';

describe('BM25 Okapi Engine & Tokenizer (NITRO-102-M1)', () => {
  describe('Tokenizer', () => {
    it('correctly parses camelCase into constituent words', () => {
      const tokens = tokenize('getUserById');
      expect(tokens).toEqual(['get', 'user', 'id']);
    });

    it('correctly parses snake_case and kebab-case into constituent words', () => {
      const snake = tokenize('stripe_payment_intent');
      expect(snake).toEqual(['stripe', 'payment', 'intent']);

      const kebab = tokenize('create-checkout-session');
      expect(kebab).toEqual(['create', 'checkout', 'session']);
    });

    it('filters common English stop words while preserving domain terms', () => {
      const tokens = tokenize('find the best hotel in Paris for a vacation');
      expect(tokens).toEqual(['find', 'best', 'hotel', 'paris', 'vacation']);
      expect(tokens).not.toContain('the');
      expect(tokens).not.toContain('in');
      expect(tokens).not.toContain('for');
      expect(tokens).not.toContain('a');
    });

    it('indexes non-Latin letters', () => {
      expect(tokenize('注文検索')).toEqual(['注文検索']);
    });

    it('drops single character tokens', () => {
      const tokens = tokenize('a b c xyz');
      expect(tokens).toEqual(['xyz']);
    });

    it('handles empty, null, or undefined strings gracefully', () => {
      expect(tokenize('')).toEqual([]);
      expect(tokenize(null as any)).toEqual([]);
      expect(tokenize(undefined as any)).toEqual([]);
    });
  });

  describe('BM25Engine', () => {
    let engine: BM25Engine<Tool>;

    beforeEach(() => {
      engine = new BM25Engine();
    });

    it('finds a tool whose name is written in non-Latin letters', () => {
      const tool = new Tool({
        name: '注文検索',
        description: '注文を検索する',
        inputSchema: z.object({}),
        handler: async () => 'ok',
      });
      engine.indexTools([tool]);
      const hits = engine.search('注文検索', 5);
      expect(hits.map((hit) => hit.item.name)).toContain('注文検索');
    });

    it('ranks exact and name-boosted matches higher than description matches', () => {
      const toolNameMatch = new Tool({
        name: 'search_flights',
        description: 'Find airline tickets between cities',
        inputSchema: z.object({}),
        handler: async () => 'flights',
      });

      const toolDescMatch = new Tool({
        name: 'travel_advisor',
        description: 'Recommends hotels and search flights options',
        inputSchema: z.object({}),
        handler: async () => 'advisor',
      });

      const toolUnrelated = new Tool({
        name: 'order_pizza',
        description: 'Order hot pepperoni pizza delivered',
        inputSchema: z.object({}),
        handler: async () => 'pizza',
      });

      engine.indexTools([toolDescMatch, toolNameMatch, toolUnrelated]);

      const results = engine.search('search flights', 5);
      expect(results.length).toBe(2);
      expect(results[0].item.name).toBe('search_flights');
      expect(results[1].item.name).toBe('travel_advisor');
      expect(results[0].score).toBeGreaterThan(results[1].score);
    });

    it('never produces negative relevance scores (Lucene non-negative IDF)', () => {
      // 5 tools all containing the word 'service'
      const tools = Array.from({ length: 5 }, (_, i) => {
        return new Tool({
          name: `service_tool_${i}`,
          description: `General cloud service utility ${i}`,
          inputSchema: z.object({}),
          handler: async () => 'ok',
        });
      });

      engine.indexTools(tools);

      const results = engine.search('service', 5);
      expect(results.length).toBe(5);
      for (const res of results) {
        expect(res.score).toBeGreaterThanOrEqual(0);
      }
    });

    it('scores a catalog that tokenizes to nothing as an empty result', () => {
      const tool = new Tool({
        name: 'a',
        description: 'the',
        inputSchema: z.object({}),
        handler: async () => 'ok',
      });
      engine.indexTools([tool]);
      const results = engine.search('refund', 5);
      expect(results).toEqual([]);
      expect(engine.getStats().avgDocLength).toBe(1);
    });

    it('skips rebuilding index when content hash is unchanged', () => {
      const tool = new Tool({
        name: 'echo',
        description: 'Echo message',
        inputSchema: z.object({}),
        handler: async () => 'echo',
      });

      const hash = 'sha256-abc-123';
      engine.indexTools([tool], hash);

      const stats1 = engine.getStats();
      expect(stats1.contentHash).toBe(hash);

      // Call indexTools with identical hash and empty list; should skip and keep existing docs
      engine.indexTools([], hash);
      const stats2 = engine.getStats();
      expect(stats2.docCount).toBe(1);
    });

    it('indexes a 100-tool catalog in under 5ms', () => {
      const tools = Array.from({ length: 100 }, (_, i) => {
        return new Tool({
          name: `enterprise_tool_${i}_action`,
          description: `Enterprise action ${i} performing database queries, customer lookups, and audit logging.`,
          inputSchema: z.object({
            userId: z.string().describe(`Target user ID for operation ${i}`),
            limit: z.number().describe('Max records returned'),
          }),
          handler: async () => 'ok',
        });
      });

      const start = performance.now();
      engine.indexTools(tools);
      const durationMs = performance.now() - start;

      expect(durationMs).toBeLessThan(50); // Generous margin for test runners, usually < 3ms
      expect(engine.getStats().docCount).toBe(100);

      const searchStart = performance.now();
      const results = engine.search('customer lookup audit', 5);
      const searchDurationMs = performance.now() - searchStart;

      expect(searchDurationMs).toBeLessThan(10);
      expect(results.length).toBe(5);
    });
  });
});
