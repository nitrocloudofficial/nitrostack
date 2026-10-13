import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { embedText } from './embedding.util.js';

export class SimilarEpisodesTool {
  @Tool({
    name: 'find_similar_episodes',
    description: 'Finds past clinical episodes semantically similar to the current symptom cluster.',
    inputSchema: z.object({
      symptoms: z.array(z.string()).describe('Array of current symptoms'),
      clinicalSummary: z.string().describe('Current clinical summary'),
      scope: z.enum(['user', 'global']).describe('Search scope: user or global'),
      userId: z.string().optional().describe('Supabase User ID for user-scoped search'),
      limit: z.number().default(5).describe('Maximum results to return')
    })
  })
  async findSimilarEpisodes(
    input: {
      symptoms: string[];
      clinicalSummary: string;
      scope: 'user' | 'global';
      userId?: string;
      limit?: number;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Performing semantic similarity search across clinical episodes', {
      scope: input.scope,
      userId: input.userId
    });

    const structuredText = `Symptoms: ${input.symptoms.join(', ')}. Summary: ${input.clinicalSummary}.`;
    const queryEmbedding = await embedText(structuredText);
    const limit = input.limit || 5;

    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return {
        status: 'mock_fallback',
        episodes: [],
        message: 'Supabase credentials missing.'
      };
    }

    try {
      const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/match_health_episodes`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          query_embedding: queryEmbedding,
          match_user_id: input.userId || null,
          match_scope: input.scope,
          match_limit: limit
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        ctx.logger.warn(`RPC match_health_episodes warning (${response.status}): ${errText}`);
        return {
          status: 'success',
          episodes: [],
          note: 'No similar episodes found or table empty.'
        };
      }

      const matches = await response.json();
      return {
        status: 'success',
        episodes: matches || []
      };
    } catch (err: any) {
      ctx.logger.error('Similarity search RPC error:', err?.message || err);
      return {
        status: 'error',
        episodes: [],
        error: err?.message || String(err)
      };
    }
  }
}
