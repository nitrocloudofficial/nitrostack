import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { embedText } from './embedding.util.js';

export class SupabaseClinicalDossierTool {
  @Tool({
    name: 'save_clinical_dossier',
    description: 'Saves clinical dossier to Supabase backend health_episodes table with pgvector embeddings',
    inputSchema: z.object({
      symptoms: z.array(z.string()).describe('Array of extracted symptoms'),
      duration: z.string().describe('String representing time length of symptoms'),
      severity: z.enum(['low', 'moderate', 'high', 'emergency']).describe('Severity level'),
      clinicalSummary: z.string().describe('Condensed medical summary of the session'),
      recommendedSpecialty: z.string().describe('Targeted doctor specialty'),
      userId: z.string().optional().describe('Optional Supabase auth user UUID')
    })
  })
  async saveClinicalDossier(
    input: {
      symptoms: string[];
      duration: string;
      severity: 'low' | 'moderate' | 'high' | 'emergency';
      clinicalSummary: string;
      recommendedSpecialty: string;
      userId?: string;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Saving clinical dossier to Supabase with semantic embedding', {
      severity: input.severity,
      specialty: input.recommendedSpecialty
    });

    // Build structured string for semantic embedding
    const structuredText = `Symptoms: ${input.symptoms.join(', ')}. Summary: ${input.clinicalSummary}.`;
    const embedding = await embedText(structuredText);

    const episodeId = `ep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const payload = {
      symptoms: input.symptoms,
      duration: input.duration,
      severity: input.severity,
      clinical_summary: input.clinicalSummary,
      recommended_specialty: input.recommendedSpecialty,
      user_id: input.userId || null,
      embedding,
      created_at: new Date().toISOString()
    };

    // Save to Supabase REST API
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_KEY || '';

    if (supabaseUrl && supabaseKey) {
      try {
        const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/health_episodes`;
        await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(payload)
        });
      } catch (err: any) {
        ctx.logger.warn('Supabase persistence warning:', err?.message || err);
      }
    }

    return {
      status: 'success',
      episodeId,
      storedData: {
        symptoms: input.symptoms,
        duration: input.duration,
        severity: input.severity,
        clinicalSummary: input.clinicalSummary,
        recommendedSpecialty: input.recommendedSpecialty,
        embeddingLength: embedding.length,
        createdAt: new Date().toISOString()
      }
    };
  }
}
